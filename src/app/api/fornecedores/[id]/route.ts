// =============================================================================
// ConstrutorPro - Fornecedor API Routes
// GET, PUT, DELETE by ID
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireOwnership } from '@/server/auth';
import {
  parseRequestBody,
  apiResponse,
  apiError,
  notFoundError,
  getValidId,
} from '@/lib/api';
import { updateSupplierSchema } from '@/validators/auth';

// -----------------------------------------------------------------------------
// GET /api/fornecedores/[id] - Obter fornecedor por ID
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validId = getValidId({ id });
  
  if (!validId) {
    return apiError('ID inválido.', { status: 400 });
  }

  const authResult = await requireOwnership('supplier', validId);
  
  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  const supplier = await db.suppliers.findUnique({
    where: { id: validId },
    include: {
      materials: {
        select: {
          id: true,
          code: true,
          name: true,
          unit: true,
          unitCost: true,
          category: true,
          isActive: true,
        },
        orderBy: { name: 'asc' },
        take: 20,
      },
      _count: {
        select: { materials: true, transactions: true },
      },
    },
  });

  if (!supplier) {
    return notFoundError('Fornecedor não encontrado.');
  }

  return apiResponse(supplier);
}

// -----------------------------------------------------------------------------
// PUT /api/fornecedores/[id] - Atualizar fornecedor
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validId = getValidId({ id });
  
  if (!validId) {
    return apiError('ID inválido.', { status: 400 });
  }

  const authResult = await requireOwnership('supplier', validId);
  
  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  const { companyId } = authResult.context!;

  const bodyResult = await parseRequestBody(request, updateSupplierSchema);
  
  if (!bodyResult.success) {
    return apiError(bodyResult.error, { status: 400, details: bodyResult.details });
  }

  const data = bodyResult.data;

  // Check if supplier exists
  const existingSupplier = await db.suppliers.findUnique({
    where: { id: validId },
  });

  if (!existingSupplier) {
    return notFoundError('Fornecedor não encontrado.');
  }

  // Check if CNPJ already exists for another supplier
  if (data.cnpj) {
    const duplicateSupplier = await db.suppliers.findFirst({
      where: {
        companyId,
        cnpj: data.cnpj,
        NOT: { id: validId },
      },
    });

    if (duplicateSupplier) {
      return apiError('Já existe outro fornecedor com este CNPJ.', { status: 400 });
    }
  }

  // Update supplier
  const supplier = await db.suppliers.update({
    where: { id: validId },
    data,
  });

  return apiResponse(supplier, { message: 'Fornecedor atualizado com sucesso.' });
}

// -----------------------------------------------------------------------------
// DELETE /api/fornecedores/[id] - Excluir fornecedor
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validId = getValidId({ id });
  
  if (!validId) {
    return apiError('ID inválido.', { status: 400 });
  }

  const authResult = await requireOwnership('supplier', validId);
  
  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  // Check if supplier exists
  const existingSupplier = await db.suppliers.findUnique({
    where: { id: validId },
    include: {
      _count: {
        select: { materials: true, transactions: true },
      },
    },
  });

  if (!existingSupplier) {
    return notFoundError('Fornecedor não encontrado.');
  }

  // Check if supplier has materials or transactions
  if (existingSupplier._count.materials > 0 || existingSupplier._count.transactions > 0) {
    return apiError(
      'Não é possível excluir este fornecedor pois ele possui materiais ou transações vinculados.',
      { status: 400 }
    );
  }

  // Delete supplier
  await db.suppliers.delete({
    where: { id: validId },
  });

  return apiResponse(null, { message: 'Fornecedor excluído com sucesso.' });
}
