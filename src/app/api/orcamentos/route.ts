// =============================================================================
// ConstrutorPro - Orçamentos API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSearchCondition } from '@/lib/api';
import { createBudgetSchema, paginationSchema } from '@/validators/auth';
import { z } from 'zod';
import { emitBudgetEvent, emitNotificationEvent } from '@/lib/realtime';

// -----------------------------------------------------------------------------
// Sort Field Validation
// -----------------------------------------------------------------------------

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'status', 'code', 'totalValue', 'validUntil'] as const;

function validateSortField(field: string | undefined): string {
  if (!field) return 'createdAt';
  return ALLOWED_SORT_FIELDS.includes(field as typeof ALLOWED_SORT_FIELDS[number])
    ? field
    : 'createdAt';
}

// -----------------------------------------------------------------------------
// Filters Schema
// -----------------------------------------------------------------------------

const budgetFiltersSchema = paginationSchema.extend({
  status: z.enum(['draft', 'pending', 'approved', 'rejected', 'revision']).optional(),
  projectId: z.string().optional(),
});

// -----------------------------------------------------------------------------
// Code Generator
// -----------------------------------------------------------------------------

async function generateBudgetCode(companyId: string): Promise<string> {
  const count = await db.budgets.count({
    where: { companyId },
  });
  
  const sequential = (count + 1).toString().padStart(4, '0');
  return `ORC-${sequential}`;
}

// -----------------------------------------------------------------------------
// GET - List Budgets
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const { companyId, isMasterAdmin } = context!;
  
  const queryResult = parseQueryParams(request, budgetFiltersSchema);
  
  if (!queryResult.success) {
    return errorResponse(queryResult.error, 400);
  }

  const { page, limit, search, sortBy, sortOrder, status, projectId } = queryResult.data;
  const { skip } = calculatePagination(page, limit);

  // Build where clause
  const where = {
    // Company filter (master admin sees all)
    ...(isMasterAdmin ? {} : { companyId }),
    ...(status ? { status } : {}),
    ...(projectId ? { projectId } : {}),
    ...buildSearchCondition(['name', 'code', 'description'], search),
  };

  const [budgets, total] = await Promise.all([
    db.budgets.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [validateSortField(sortBy)]: sortOrder || 'desc' },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
        _count: {
          select: { budget_items: true },
        },
      },
    }),
    db.budgets.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(budgets, total, page, limit));
}

// -----------------------------------------------------------------------------
// POST - Create Budget
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, createBudgetSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;
  const companyId = context!.companyId;

  // Validate project belongs to company if provided
  if (data.projectId) {
    const project = await db.projects.findFirst({
      where: { id: data.projectId, companyId },
    });
    if (!project) {
      return errorResponse('Projeto não encontrado.', 404);
    }
  }

  // Generate code if not provided
  const code = data.code || await generateBudgetCode(companyId);

  // Check code uniqueness within company
  const existingBudget = await db.budgets.findFirst({
    where: { companyId, code },
  });

  if (existingBudget) {
    return errorResponse('Já existe um orçamento com este código.', 400);
  }

  // Calculate total value from items
  let totalValue = 0;
  const processedItems = data.items.map((item, index) => {
    const totalPrice = item.quantity * item.unitPrice;
    totalValue += totalPrice;
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
  if (data.discount && data.discount > 0) {
    totalValue = totalValue * (1 - data.discount / 100);
  }

  // Create budget with items in transaction
  const budget = await db.$transaction(async (tx) => {
    return tx.budgets.create({
      data: {
        companyId,
        projectId: data.projectId,
        name: data.name,
        code,
        description: data.description,
        status: data.status || 'draft',
        totalValue,
        discount: data.discount,
        validUntil: data.validUntil,
        notes: data.notes,
        budget_items: {
          create: processedItems,
        },
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
  emitBudgetEvent.created(companyId, budget, context!.user.id);

  // Criar notificação
  emitNotificationEvent.new(companyId, {
    id: `budget_${budget.id}_${Date.now()}`,
    type: 'info',
    title: 'Novo Orçamento',
    message: `Orçamento "${budget.name}" foi criado com sucesso.`,
    entityId: budget.id,
    entityType: 'budget',
    read: false,
    createdAt: new Date(),
  });

  return successResponse(budget, 'Orçamento criado com sucesso.');
}
