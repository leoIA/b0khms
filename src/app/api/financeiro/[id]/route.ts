// =============================================================================
// ConstrutorPro - Finance Transaction [id] API Routes
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { updateTransactionSchema } from '@/validators/auth';

// -----------------------------------------------------------------------------
// GET /api/financeiro/[id] - Get Transaction by ID
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const { id } = await params;

  const where: { id: string; companyId?: string } = { id };
  if (!context!.isMasterAdmin) {
    where.companyId = context!.companyId;
  }

  const transaction = await db.transactions.findFirst({
    where,
    include: {
      projects: { select: { id: true, name: true } },
      suppliers: { select: { id: true, name: true } },
      clients: { select: { id: true, name: true } },
    },
  });

  if (!transaction) {
    return errorResponse('Transação não encontrada.', 404);
  }

  return successResponse(transaction);
}

// -----------------------------------------------------------------------------
// PUT /api/financeiro/[id] - Update Transaction
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const { id } = await params;
  const companyId = context!.companyId;

  // Check if transaction exists and belongs to company
  const where: { id: string; companyId?: string } = { id };
  if (!context!.isMasterAdmin) {
    where.companyId = companyId;
  }

  const existingTransaction = await db.transactions.findFirst({ where });

  if (!existingTransaction) {
    return errorResponse('Transação não encontrada.', 404);
  }

  const bodyResult = await parseRequestBody(request, updateTransactionSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;

  // Validate projectId belongs to company if being updated
  if (data.projectId) {
    const project = await db.projects.findFirst({
      where: { id: data.projectId, companyId },
    });
    if (!project) {
      return errorResponse('Projeto não encontrado.', 404);
    }
  }

  // Validate supplierId belongs to company if being updated
  if (data.supplierId) {
    const supplier = await db.suppliers.findFirst({
      where: { id: data.supplierId, companyId },
    });
    if (!supplier) {
      return errorResponse('Fornecedor não encontrado.', 404);
    }
  }

  // Validate clientId belongs to company if being updated
  if (data.clientId) {
    const client = await db.clients.findFirst({
      where: { id: data.clientId, companyId },
    });
    if (!client) {
      return errorResponse('Cliente não encontrado.', 404);
    }
  }

  const transaction = await db.transactions.update({
    where: { id },
    data,
    include: {
      projects: { select: { id: true, name: true } },
      suppliers: { select: { id: true, name: true } },
      clients: { select: { id: true, name: true } },
    },
  });

  return successResponse(transaction, 'Transação atualizada com sucesso.');
}

// -----------------------------------------------------------------------------
// DELETE /api/financeiro/[id] - Delete Transaction
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const { id } = await params;
  const companyId = context!.companyId;

  // Check if transaction exists and belongs to company
  const where: { id: string; companyId?: string } = { id };
  if (!context!.isMasterAdmin) {
    where.companyId = companyId;
  }

  const existingTransaction = await db.transactions.findFirst({ where });

  if (!existingTransaction) {
    return errorResponse('Transação não encontrada.', 404);
  }

  await db.transactions.delete({
    where: { id },
  });

  return successResponse({ id }, 'Transação excluída com sucesso.');
}
