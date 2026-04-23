// =============================================================================
// ConstrutorPro - Suppliers API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSearchCondition } from '@/lib/api';
import { createSupplierSchema, paginationSchema } from '@/validators/auth';

// -----------------------------------------------------------------------------
// Sort Field Validation
// -----------------------------------------------------------------------------

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'tradeName', 'status', 'category'] as const;

function validateSortField(field: string | undefined): string {
  if (!field) return 'createdAt';
  return ALLOWED_SORT_FIELDS.includes(field as typeof ALLOWED_SORT_FIELDS[number])
    ? field
    : 'createdAt';
}

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
    ...buildSearchCondition(['name', 'tradeName', 'cnpj', 'category'], search),
  };

  const [suppliers, total] = await Promise.all([
    db.suppliers.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [validateSortField(sortBy)]: sortOrder || 'desc' },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    }),
    db.suppliers.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(suppliers, total, page, limit));
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, createSupplierSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;

  // Check for duplicate CNPJ
  if (data.cnpj) {
    const existing = await db.suppliers.findFirst({
      where: {
        companyId: context!.companyId,
        cnpj: data.cnpj,
      },
    });

    if (existing) {
      return errorResponse('CNPJ já cadastrado para outro fornecedor.', 400);
    }
  }

  const supplier = await db.suppliers.create({
    data: {
      ...data,
      companyId: context!.companyId!,
    },
  });

  return successResponse(supplier, 'Fornecedor criado com sucesso.');
}
