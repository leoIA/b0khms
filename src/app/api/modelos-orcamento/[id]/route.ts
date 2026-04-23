// =============================================================================
// ConstrutorPro - Budget Template by ID API
// GET, PUT, DELETE /api/modelos-orcamento/[id]
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOwnership, successResponse, errorResponse } from '@/server/auth';
import { getValidId, apiError } from '@/lib/api';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const updateBudgetTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    compositionId: z.string().optional(),
    description: z.string().min(1, 'Descrição é obrigatória'),
    unit: z.string().min(1, 'Unidade é obrigatória'),
    quantity: z.number().positive('Quantidade deve ser positiva'),
    unitPrice: z.number().min(0, 'Preço unitário deve ser não negativo').optional(),
    notes: z.string().optional(),
    order: z.number().optional(),
  })).optional(),
});

// -----------------------------------------------------------------------------
// GET - Get Budget Template by ID
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

  const authResult = await requireOwnership('budgetTemplate', validId);

  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  const template = await db.budget_templates.findUnique({
    where: { id: validId },
    include: {
      budget_template_items: {
        orderBy: { order: 'asc' },
        include: {
          compositions: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true,
              totalPrice: true,
            },
          },
        },
      },
    },
  });

  if (!template) {
    return errorResponse('Modelo de orçamento não encontrado.', 404);
  }

  // Format response
  const formattedTemplate = {
    ...template,
    budget_template_items: template.budget_template_items.map((item) => ({
      ...item,
      quantity: typeof item.quantity === 'object' && 'toNumber' in item.quantity
        ? item.quantity.toNumber()
        : Number(item.quantity),
      unitPrice: typeof item.unitPrice === 'object' && 'toNumber' in item.unitPrice
        ? item.unitPrice.toNumber()
        : Number(item.unitPrice),
      compositions: item.compositions
        ? {
            ...item.compositions,
            totalPrice: typeof item.compositions.totalPrice === 'object' && 'toNumber' in item.compositions.totalPrice
              ? item.compositions.totalPrice.toNumber()
              : Number(item.compositions.totalPrice),
          }
        : null,
    })),
    totalValue: template.budget_template_items.reduce((sum, item) => {
      const price = typeof item.unitPrice === 'object' && 'toNumber' in item.unitPrice
        ? item.unitPrice.toNumber()
        : Number(item.unitPrice);
      const qty = typeof item.quantity === 'object' && 'toNumber' in item.quantity
        ? item.quantity.toNumber()
        : Number(item.quantity);
      return sum + price * qty;
    }, 0),
  };

  return successResponse(formattedTemplate);
}

// -----------------------------------------------------------------------------
// PUT - Update Budget Template
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

  const authResult = await requireOwnership('budgetTemplate', validId);

  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  const { companyId } = authResult.context!;

  const body = await request.json();
  const parseResult = updateBudgetTemplateSchema.safeParse(body);

  if (!parseResult.success) {
    return errorResponse('Dados inválidos', 400, parseResult.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const data = parseResult.data;

  // Check if template exists
  const existingTemplate = await db.budget_templates.findUnique({
    where: { id: validId },
  });

  if (!existingTemplate) {
    return errorResponse('Modelo de orçamento não encontrado.', 404);
  }

  // Check code uniqueness
  if (data.code && data.code !== existingTemplate.code) {
    const duplicateTemplate = await db.budget_templates.findFirst({
      where: { companyId, code: data.code, NOT: { id: validId } },
    });

    if (duplicateTemplate) {
      return errorResponse('Já existe um modelo com este código.', 400);
    }
  }

  // Validate compositions if provided
  if (data.items) {
    for (const item of data.items) {
      if (item.compositionId) {
        const composition = await db.compositions.findFirst({
          where: { id: item.compositionId, companyId },
        });

        if (!composition) {
          return errorResponse(`Composição ${item.compositionId} não encontrada.`, 404);
        }
      }
    }
  }

  // Update template
  const template = await db.$transaction(async (tx) => {
    // Update items if provided
    if (data.items) {
      // Delete existing items
      await tx.budget_template_items.deleteMany({
        where: { templateId: validId },
      });

      // Create new items
      await tx.budget_template_items.createMany({
        data: data.items!.map((item, index) => ({
          templateId: validId,
          compositionId: item.compositionId,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? 0,
          notes: item.notes,
          order: item.order ?? index,
        })),
      });
    }

    // Update template
    return tx.budget_templates.update({
      where: { id: validId },
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        category: data.category,
        isActive: data.isActive,
      },
      include: {
        budget_template_items: {
          orderBy: { order: 'asc' },
          include: {
            compositions: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  });

  return successResponse(template, 'Modelo de orçamento atualizado com sucesso.');
}

// -----------------------------------------------------------------------------
// DELETE - Delete Budget Template
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

  const authResult = await requireOwnership('budgetTemplate', validId);

  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  // Delete template (cascade will handle items)
  await db.budget_templates.delete({
    where: { id: validId },
  });

  return successResponse(null, 'Modelo de orçamento excluído com sucesso.');
}
