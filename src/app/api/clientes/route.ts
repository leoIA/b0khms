// =============================================================================
// ConstrutorPro - Clients API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSearchCondition, buildSortCondition } from '@/lib/api';
import { createClientSchema, paginationSchema } from '@/validators/auth';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const queryResult = parseQueryParams(request, paginationSchema);
  
  if (!queryResult.success) {
    return errorResponse(queryResult.error, 400);
  }

  const { page, limit, search, sortBy, sortOrder, status } = queryResult.data;
  const { skip } = calculatePagination(page, limit);

  const where = {
    companyId: context!.companyId,
    ...(status && status !== 'all' ? { status } : {}),
    ...buildSearchCondition(['name', 'email', 'cpfCnpj'], search),
  };

  const [clients, total] = await Promise.all([
    db.clients.findMany({
      where,
      skip,
      take: limit,
      orderBy: buildSortCondition(sortBy, sortOrder),
      include: {
        _count: {
          select: { projects: true },
        },
      },
    }),
    db.clients.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(clients, total, page, limit));
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, createClientSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;

  // Check for duplicate CPF/CNPJ
  if (data.cpfCnpj) {
    const existing = await db.clients.findFirst({
      where: {
        companyId: context!.companyId,
        cpfCnpj: data.cpfCnpj,
      },
    });

    if (existing) {
      return errorResponse('CPF/CNPJ já cadastrado para outro cliente.', 400);
    }
  }

  const client = await db.clients.create({
    data: {
      ...data,
      companyId: context!.companyId,
    },
  });

  return successResponse(client, 'Cliente criado com sucesso.');
}
