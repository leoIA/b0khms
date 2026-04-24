// =============================================================================
// ConstrutorPro - Orçamento by ID API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOwnership, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { updateBudgetSchema } from '@/validators/auth';
import { emitBudgetEvent, emitNotificationEvent } from '@/lib/realtime';

// -----------------------------------------------------------------------------
// GET - Get Budget by ID
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const authResult = await requireOwnership('budget', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const budget = await db.budgets.findUnique({
    where: { id },
    include: {
      projects: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          clients: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      budget_items: {
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
      _count: {
        select: { budget_items: true },
      },
    },
  });

  if (!budget) {
    return errorResponse('Orçamento não encontrado.', 404);
  }

  return successResponse(budget);
}

// -----------------------------------------------------------------------------
// PUT - Update Budget
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const authResult = await requireOwnership('budget', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, updateBudgetSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;

  // Validate project belongs to company if provided
  if (data.projectId) {
    const project = await db.projects.findFirst({
      where: { id: data.projectId, companyId: context!.companyId },
    });
    if (!project) {
      return errorResponse('Projeto não encontrado.', 404);
    }
  }

  // Check code uniqueness if code is being updated
  if (data.code) {
    const existingBudget = await db.budgets.findFirst({
      where: {
        companyId: context!.companyId,
        code: data.code,
        NOT: { id },
      },
    });

    if (existingBudget) {
      return errorResponse('Já existe um orçamento com este código.', 400);
    }
  }

  // Calculate total value from items if items are provided
  let totalValue: number | undefined;
  let processedItems: Array<{
    compositionId?: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
    order: number;
  }> | undefined;

  if (data.items && data.items.length > 0) {
    totalValue = 0;
    processedItems = data.items.map((item, index) => {
      const totalPrice = item.quantity * item.unitPrice;
      totalValue! += totalPrice;
      return {
        compositionId: item.compositionId,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
        notes: item.notes,
        order: item.order ?? index,
      };
    });

    // Apply discount if provided
    const discount = data.discount !== undefined ? data.discount : 0;
    if (discount && discount > 0) {
      totalValue = totalValue * (1 - discount / 100);
    }
  }

  // Update budget with items in transaction
  const budget = await db.$transaction(async (tx) => {
    // If items are provided, delete existing and create new
    if (processedItems) {
      await tx.budget_items.deleteMany({
        where: { budgetId: id },
      });
    }

    return tx.budgets.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        projectId: data.projectId,
        status: data.status,
        discount: data.discount,
        validUntil: data.validUntil,
        notes: data.notes,
        ...(totalValue !== undefined ? { totalValue } : {}),
        ...(processedItems ? {
          budget_items: {
            create: processedItems,
          },
        } : {}),
        updatedAt: new Date(),
      },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        budget_items: {
          orderBy: { order: 'asc' },
          include: {
            compositions: {
              select: {
                id: true,
                code: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });
  });

  // Emitir evento de realtime
  const companyId = context!.companyId!;
  const userId = context!.user.id;
  if (data.status === 'approved') {
    emitBudgetEvent.approved(companyId, budget, userId);
    emitNotificationEvent.new(companyId, {
      id: `budget_app_${budget.id}_${Date.now()}`,
      type: 'success',
      title: 'Orçamento Aprovado',
      message: `Orçamento "${budget.name}" foi aprovado.`,
      entityId: budget.id,
      entityType: 'budget',
      read: false,
      createdAt: new Date(),
    });
  } else if (data.status === 'rejected') {
    emitBudgetEvent.rejected(companyId, budget, userId);
    emitNotificationEvent.new(companyId, {
      id: `budget_rej_${budget.id}_${Date.now()}`,
      type: 'warning',
      title: 'Orçamento Rejeitado',
      message: `Orçamento "${budget.name}" foi rejeitado.`,
      entityId: budget.id,
      entityType: 'budget',
      read: false,
      createdAt: new Date(),
    });
  } else {
    emitBudgetEvent.updated(companyId, budget, userId);
  }

  return successResponse(budget, 'Orçamento atualizado com sucesso.');
}

// -----------------------------------------------------------------------------
// DELETE - Delete Budget
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const authResult = await requireOwnership('budget', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  // Obter nome antes de deletar
  const budget = await db.budgets.findUnique({
    where: { id },
    select: { name: true },
  });
  const budgetName = budget?.name || 'Orçamento';

  // Delete budget (cascade will handle items)
  await db.budgets.delete({
    where: { id },
  });

  // Emitir evento de realtime
  const { companyId, user } = authResult.context!;
  emitBudgetEvent.deleted(companyId, id, user.id);

  emitNotificationEvent.new(companyId, {
    id: `budget_del_${id}_${Date.now()}`,
    type: 'warning',
    title: 'Orçamento Excluído',
    message: `Orçamento "${budgetName}" foi excluído.`,
    entityId: id,
    entityType: 'budget',
    read: false,
    createdAt: new Date(),
  });

  return successResponse(null, 'Orçamento excluído com sucesso.');
}
