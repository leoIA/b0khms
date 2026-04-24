// =============================================================================
// ConstrutorPro - Materiais API - Get, Update, Delete
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOwnership, successResponse, errorResponse, parseRequestBody, notFoundResponse } from '@/server/auth';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const updateMaterialSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').max(50).optional(),
  name: z.string().min(1, 'Nome é obrigatório').max(200).optional(),
  description: z.string().optional().nullable(),
  unit: z.string().min(1, 'Unidade é obrigatória').optional(),
  unitCost: z.coerce.number().min(0, 'Custo unitário deve ser maior ou igual a zero').optional(),
  unitPrice: z.coerce.number().min(0).optional().nullable(),
  supplierId: z.string().optional().nullable(),
  stockQuantity: z.coerce.number().min(0).optional().nullable(),
  minStock: z.coerce.number().min(0).optional().nullable(),
  category: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// GET - Get Material by ID
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireOwnership('material', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const material = await db.materials.findUnique({
    where: { id },
    include: {
      suppliers: {
        select: {
          id: true,
          name: true,
          tradeName: true,
          status: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!material) {
    return notFoundResponse('Material não encontrado');
  }

  // Add low stock status
  const materialWithStockStatus = {
    ...material,
    isLowStock: material.stockQuantity !== null &&
                material.minStock !== null &&
                material.stockQuantity < material.minStock,
  };

  return successResponse(materialWithStockStatus);
}

// -----------------------------------------------------------------------------
// PUT - Update Material
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireOwnership('material', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;

  // Check if material exists and belongs to company
  const existingMaterial = await db.materials.findFirst({
    where: {
      id,
      companyId,
    },
  });

  if (!existingMaterial) {
    return notFoundResponse('Material não encontrado');
  }

  // Parse and validate request body
  const bodyResult = await parseRequestBody(request, updateMaterialSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data as z.infer<typeof updateMaterialSchema>;

  // Check if code is unique within company (if changing code)
  if (data.code && data.code !== existingMaterial.code) {
    const materialWithCode = await db.materials.findFirst({
      where: {
        companyId,
        code: data.code,
        NOT: { id },
      },
    });

    if (materialWithCode) {
      return errorResponse('Já existe um material com este código', 400);
    }
  }

  // Validate supplier if provided
  if (data.supplierId) {
    const supplier = await db.suppliers.findFirst({
      where: {
        id: data.supplierId,
        companyId,
      },
    });

    if (!supplier) {
      return errorResponse('Fornecedor não encontrado', 400);
    }
  }

  // Update material
  const material = await db.materials.update({
    where: { id },
    data: {
      code: data.code,
      name: data.name,
      description: data.description,
      unit: data.unit,
      unitCost: data.unitCost,
      unitPrice: data.unitPrice,
      supplierId: data.supplierId,
      stockQuantity: data.stockQuantity,
      minStock: data.minStock,
      category: data.category,
      isActive: data.isActive,
    },
    include: {
      suppliers: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  return successResponse(material, 'Material atualizado com sucesso');
}

// -----------------------------------------------------------------------------
// DELETE - Delete Material
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireOwnership('material', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;

  // Check if material exists
  const material = await db.materials.findFirst({
    where: { id, companyId },
  });

  if (!material) {
    return notFoundResponse('Material não encontrado');
  }

  // Check if material is used in compositions
  const compositionItemsCount = await db.composition_items.count({
    where: { materialId: id },
  });

  if (compositionItemsCount > 0) {
    return errorResponse(
      'Não é possível excluir este material pois ele está sendo utilizado em composições',
      400
    );
  }

  // Delete material
  await db.materials.delete({
    where: { id },
  });

  return successResponse(null, 'Material excluído com sucesso');
}
