// =============================================================================
// ConstrutorPro - Composições API - Get, Update, Delete
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOwnership, successResponse, errorResponse, parseRequestBody, notFoundResponse } from '@/server/auth';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const compositionItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  unitCost: z.coerce.number().min(0, 'Custo unitário deve ser maior ou igual a zero'),
  itemType: z.enum(['material', 'labor', 'equipment', 'service', 'other']),
  materialId: z.string().optional().nullable(),
  coefficient: z.coerce.number().optional().nullable(),
  order: z.coerce.number().int().min(0).optional().default(0),
});

const updateCompositionSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').max(50).optional(),
  name: z.string().min(1, 'Nome é obrigatório').max(200).optional(),
  description: z.string().optional().nullable(),
  unit: z.string().min(1, 'Unidade é obrigatória').optional(),
  profitMargin: z.coerce.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  composition_items: z.array(compositionItemSchema).optional(),
});

// -----------------------------------------------------------------------------
// GET - Get Composition by ID
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireOwnership('composition', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const composition = await db.compositions.findUnique({
    where: { id },
    include: {
      composition_items: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!composition) {
    return notFoundResponse('Composição não encontrada');
  }

  return successResponse(composition);
}

// -----------------------------------------------------------------------------
// PUT - Update Composition
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireOwnership('composition', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;

  // Check if composition exists and belongs to company
  const existingComposition = await db.compositions.findFirst({
    where: {
      id,
      companyId,
    },
    include: {
      composition_items: true,
    },
  });

  if (!existingComposition) {
    return notFoundResponse('Composição não encontrada');
  }

  // Parse and validate request body
  const bodyResult = await parseRequestBody(request, updateCompositionSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data as z.infer<typeof updateCompositionSchema>;

  // Check if code is unique within company (if changing code)
  if (data.code && data.code !== existingComposition.code) {
    const compositionWithCode = await db.compositions.findFirst({
      where: {
        companyId,
        code: data.code,
        NOT: { id },
      },
    });

    if (compositionWithCode) {
      return errorResponse('Já existe uma composição com este código', 400);
    }
  }

  // Calculate values
  let totalCost = existingComposition.totalCost.toNumber();
  let profitMargin = data.profitMargin ?? existingComposition.profitMargin;

  // Update items if provided
  if (data.composition_items !== undefined) {
    // Delete existing items
    await db.composition_items.deleteMany({
      where: { compositionId: id },
    });

    // Calculate total cost from new items
    totalCost = 0;
    const processedItems = data.composition_items.map((item, index) => {
      const itemTotalCost = item.quantity * item.unitCost;
      totalCost += itemTotalCost;
      return {
        compositionId: id,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: itemTotalCost,
        itemType: item.itemType,
        materialId: item.materialId,
        coefficient: item.coefficient,
        order: item.order ?? index,
      };
    });

    // Create new items
    await db.composition_items.createMany({
      data: processedItems,
    });
  }

  // Calculate total price with profit margin
  const totalPrice = totalCost * (1 + profitMargin / 100);

  // Update composition
  const composition = await db.compositions.update({
    where: { id },
    data: {
      code: data.code,
      name: data.name,
      description: data.description,
      unit: data.unit,
      totalCost,
      totalPrice,
      profitMargin,
      isActive: data.isActive,
    },
    include: {
      composition_items: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return successResponse(composition, 'Composição atualizada com sucesso');
}

// -----------------------------------------------------------------------------
// DELETE - Delete Composition
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireOwnership('composition', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;

  // Check if composition exists
  const composition = await db.compositions.findFirst({
    where: { id, companyId },
  });

  if (!composition) {
    return notFoundResponse('Composição não encontrada');
  }

  // Delete composition (items will be cascade deleted)
  await db.compositions.delete({
    where: { id },
  });

  return successResponse(null, 'Composição excluída com sucesso');
}
