// =============================================================================
// ConstrutorPro - Afastamentos API (RH)
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSortCondition } from '@/lib/api';
import { z } from 'zod';

const leaveSchema = z.object({
  employeeId: z.string().min(1, 'Funcionário é obrigatório'),
  type: z.enum(['sick_leave', 'accident', 'maternity', 'paternity', 'marriage', 'bereavement', 'suspension', 'other']),
  reason: z.string().min(3, 'Motivo é obrigatório'),
  startDate: z.string(),
  endDate: z.string().optional(),
  documentUrl: z.string().optional(),
  cidCode: z.string().optional(),
  isPaid: z.boolean().default(true),
  paidPercent: z.number().min(0).max(100).default(100),
  notes: z.string().optional(),
});

const leaveQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  employeeId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const queryResult = parseQueryParams(request, leaveQuerySchema);

  if (!queryResult.success) {
    return errorResponse(queryResult.error, 400);
  }

  const { page, limit, employeeId, type, status, sortBy, sortOrder } = queryResult.data;
  const { skip } = calculatePagination(page, limit);

  const where = {
    companyId: context!.companyId,
    ...(employeeId ? { employeeId } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
  };

  const [leaves, total] = await Promise.all([
    db.employee_leaves.findMany({
      where,
      skip,
      take: limit,
      orderBy: buildSortCondition(sortBy, sortOrder),
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            jobTitle: true,
            department: true,
          },
        },
      },
    }),
    db.employee_leaves.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(leaves, total, page, limit));
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, leaveSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;

  // Verificar se funcionário existe
  const employee = await db.employees.findFirst({
    where: {
      id: data.employeeId,
      companyId: context!.companyId,
    },
  });

  if (!employee) {
    return errorResponse('Funcionário não encontrado.', 404);
  }

  // Calcular dias de afastamento
  const startDate = new Date(data.startDate);
  const endDate = data.endDate ? new Date(data.endDate) : null;
  let days = 0;

  if (endDate) {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  const leave = await db.employee_leaves.create({
    data: {
      companyId: context!.companyId,
      employeeId: data.employeeId,
      type: data.type,
      reason: data.reason,
      startDate,
      endDate,
      days: days || null,
      documentUrl: data.documentUrl,
      cidCode: data.cidCode,
      isPaid: data.isPaid,
      paidPercent: data.paidPercent,
      notes: data.notes,
    },
    include: {
      employees: {
        select: {
          id: true,
          name: true,
          employeeNumber: true,
        },
      },
    },
  });

  // Atualizar status do funcionário
  await db.employees.update({
    where: { id: data.employeeId },
    data: { status: 'leave' },
  });

  return successResponse(leave, 'Afastamento cadastrado com sucesso.');
}

// Encerrar afastamento
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, z.object({
    id: z.string(),
    action: z.enum(['return', 'cancel']),
    returnDate: z.string().optional(),
  }));

  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const { id, action, returnDate } = bodyResult.data;
  const { context } = authResult;

  const leave = await db.employee_leaves.findFirst({
    where: { id, companyId: context!.companyId },
  });

  if (!leave) {
    return errorResponse('Afastamento não encontrado.', 404);
  }

  if (action === 'return') {
    const returnedAt = returnDate ? new Date(returnDate) : new Date();

    const updated = await db.employee_leaves.update({
      where: { id },
      data: {
        status: 'returned',
        returnedAt,
        endDate: returnedAt,
      },
    });

    // Atualizar status do funcionário para ativo
    await db.employees.update({
      where: { id: leave.employeeId },
      data: { status: 'active' },
    });

    return successResponse(updated, 'Retorno registrado com sucesso.');
  } else {
    const updated = await db.employee_leaves.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    // Atualizar status do funcionário
    await db.employees.update({
      where: { id: leave.employeeId },
      data: { status: 'active' },
    });

    return successResponse(updated, 'Afastamento cancelado.');
  }
}
