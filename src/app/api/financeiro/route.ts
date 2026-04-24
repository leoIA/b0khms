// =============================================================================
// ConstrutorPro - Finance API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSearchCondition } from '@/lib/api';
import { createTransactionSchema, paginationSchema } from '@/validators/auth';
import { createOverduePaymentAlert } from '@/lib/alerts';

// -----------------------------------------------------------------------------
// Sort Field Validation
// -----------------------------------------------------------------------------

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'date', 'dueDate', 'status', 'value', 'description'] as const;

function validateSortField(field: string | undefined): string {
  if (!field) return 'date';
  return ALLOWED_SORT_FIELDS.includes(field as typeof ALLOWED_SORT_FIELDS[number])
    ? field
    : 'date';
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

  const { page, limit, search, sortBy, sortOrder } = queryResult.data;
  const { skip } = calculatePagination(page, limit);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'income' | 'expense' | null;
  const status = searchParams.get('status') as 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled' | null;
  const projectId = searchParams.get('projectId');

  const where = {
    companyId: context!.companyId,
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(projectId ? { projectId } : {}),
    ...buildSearchCondition(['description', 'documentNumber'], search),
  };

  const [transactions, total] = await Promise.all([
    db.transactions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [validateSortField(sortBy)]: sortOrder || 'desc' },
      include: {
        projects: { select: { id: true, name: true } },
        suppliers: { select: { id: true, name: true } },
        clients: { select: { id: true, name: true } },
      },
    }),
    db.transactions.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(transactions, total, page, limit));
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, createTransactionSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;
  const companyId = context!.companyId;

  // Validate projectId belongs to company
  if (data.projectId) {
    const project = await db.projects.findFirst({
      where: { id: data.projectId, companyId },
    });
    if (!project) {
      return errorResponse('Projeto não encontrado.', 404);
    }
  }

  // Validate supplierId belongs to company
  if (data.supplierId) {
    const supplier = await db.suppliers.findFirst({
      where: { id: data.supplierId, companyId },
    });
    if (!supplier) {
      return errorResponse('Fornecedor não encontrado.', 404);
    }
  }

  // Validate clientId belongs to company
  if (data.clientId) {
    const client = await db.clients.findFirst({
      where: { id: data.clientId, companyId },
    });
    if (!client) {
      return errorResponse('Cliente não encontrado.', 404);
    }
  }

  const transaction = await db.transactions.create({
    data: {
      ...data,
      companyId: companyId!,
    },
    include: {
      projects: { select: { id: true, name: true } },
      suppliers: { select: { id: true, name: true } },
      clients: { select: { id: true, name: true } },
    },
  });

  // Check for overdue payment alert if dueDate is in the past and status is pending
  if (data.dueDate && new Date(data.dueDate) < new Date() && 
      (data.status === 'pending' || data.status === 'partial' || !data.status)) {
    try {
      await createOverduePaymentAlert(
        companyId!,
        transaction.id,
        data.description,
        Number(data.value),
        new Date(data.dueDate)
      );
    } catch (error) {
      console.error('Erro ao criar alerta de pagamento vencido:', error);
      // Don't fail the request if alert creation fails
    }
  }

  return successResponse(transaction, 'Transação criada com sucesso.');
}
