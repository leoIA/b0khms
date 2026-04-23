// =============================================================================
// ConstrutorPro - Férias API (RH)
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSortCondition } from '@/lib/api';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const vacationSchema = z.object({
  employeeId: z.string().min(1, 'Funcionário é obrigatório'),
  acquisitionStart: z.string(),
  acquisitionEnd: z.string(),
  vacationStart: z.string(),
  vacationEnd: z.string(),
  days: z.number().int().min(1).max(30),
  soldDays: z.number().int().min(0).max(10).default(0),
  advance13th: z.boolean().default(false),
  notes: z.string().optional(),
});

const vacationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  employeeId: z.string().optional(),
  status: z.string().optional(),
  year: z.coerce.number().int().optional(),
  sortBy: z.string().default('vacationStart'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const queryResult = parseQueryParams(request, vacationQuerySchema);

  if (!queryResult.success) {
    return errorResponse(queryResult.error, 400);
  }

  const { page, limit, employeeId, status, year, sortBy, sortOrder } = queryResult.data;
  const { skip } = calculatePagination(page, limit);

  const where = {
    companyId: context!.companyId,
    ...(employeeId ? { employeeId } : {}),
    ...(status ? { status } : {}),
    ...(year ? {
      OR: [
        { vacationStart: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
        { acquisitionEnd: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
      ],
    } : {}),
  };

  const [vacations, total] = await Promise.all([
    db.employee_vacations.findMany({
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
            salary: true,
          },
        },
      },
    }),
    db.employee_vacations.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(vacations, total, page, limit));
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, vacationSchema);
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

  // Calcular valores
  const salary = Number(employee.salary);
  const dailySalary = salary / 30;
  const vacationValue = dailySalary * (data.days - data.soldDays);
  const oneThirdValue = vacationValue / 3;
  const soldValue = data.soldDays > 0 ? dailySalary * data.soldDays * 2.5 : 0; // Abono pecuniário = dias * salário dia + 1/3
  const totalValue = vacationValue + oneThirdValue + soldValue;

  const vacation = await db.employee_vacations.create({
    data: {
      companyId: context!.companyId,
      employeeId: data.employeeId,
      acquisitionStart: new Date(data.acquisitionStart),
      acquisitionEnd: new Date(data.acquisitionEnd),
      vacationStart: new Date(data.vacationStart),
      vacationEnd: new Date(data.vacationEnd),
      days: data.days,
      soldDays: data.soldDays,
      soldValue: new Decimal(soldValue),
      advance13th: data.advance13th,
      advance13thValue: data.advance13th ? new Decimal(salary / 2) : null,
      vacationValue: new Decimal(vacationValue),
      oneThirdValue: new Decimal(oneThirdValue),
      totalValue: new Decimal(totalValue),
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

  return successResponse(vacation, 'Férias cadastradas com sucesso.');
}

// Aprovar férias
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, z.object({
    id: z.string(),
    action: z.enum(['approve', 'cancel']),
  }));

  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const { id, action } = bodyResult.data;
  const { context } = authResult;

  const vacation = await db.employee_vacations.findFirst({
    where: { id, companyId: context!.companyId },
  });

  if (!vacation) {
    return errorResponse('Registro de férias não encontrado.', 404);
  }

  if (action === 'approve') {
    const updated = await db.employee_vacations.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: context!.user.id,
        approvedAt: new Date(),
      },
    });

    // Atualizar status do funcionário para férias
    await db.employees.update({
      where: { id: vacation.employeeId },
      data: { status: 'vacation' },
    });

    return successResponse(updated, 'Férias aprovadas com sucesso.');
  } else {
    const updated = await db.employee_vacations.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return successResponse(updated, 'Férias canceladas.');
  }
}
