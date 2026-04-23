// =============================================================================
// ConstrutorPro - Registro de Ponto API (RH)
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSortCondition } from '@/lib/api';
import { z } from 'zod';

const timeRecordSchema = z.object({
  employeeId: z.string().min(1, 'Funcionário é obrigatório'),
  date: z.string(),
  time: z.string(),
  type: z.enum(['entry', 'exit', 'break_start', 'break_end', 'overtime_start', 'overtime_end']),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  location: z.string().optional(),
  device: z.enum(['web', 'mobile', 'biometric', 'manual']).default('web'),
  deviceId: z.string().optional(),
  notes: z.string().optional(),
});

const timeRecordQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  employeeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.string().optional(),
  sortBy: z.string().default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const queryResult = parseQueryParams(request, timeRecordQuerySchema);

  if (!queryResult.success) {
    return errorResponse(queryResult.error, 400);
  }

  const { page, limit, employeeId, startDate, endDate, type, sortBy, sortOrder } = queryResult.data;
  const { skip } = calculatePagination(page, limit);

  const where = {
    companyId: context!.companyId,
    ...(employeeId ? { employeeId } : {}),
    ...(type ? { type } : {}),
    ...(startDate || endDate ? {
      date: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      },
    } : {}),
  };

  const [records, total] = await Promise.all([
    db.time_records.findMany({
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
    db.time_records.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(records, total, page, limit));
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, timeRecordSchema);
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

  // Verificar status do funcionário
  if (employee.status !== 'active') {
    return errorResponse('Funcionário não está ativo.', 400);
  }

  const recordDate = new Date(data.date);
  const recordTime = new Date(`${data.date}T${data.time}`);

  const record = await db.time_records.create({
    data: {
      companyId: context!.companyId,
      employeeId: data.employeeId,
      date: recordDate,
      time: recordTime,
      type: data.type,
      latitude: data.latitude,
      longitude: data.longitude,
      location: data.location,
      device: data.device,
      deviceId: data.deviceId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
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

  return successResponse(record, 'Registro de ponto criado com sucesso.');
}
