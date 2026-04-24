// =============================================================================
// ConstrutorPro - Budget vs Actual API
// GET /api/projetos/[id]/budget-vs-actual
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOwnership, successResponse, errorResponse } from '@/server/auth';
import { getValidId, apiError } from '@/lib/api';

// -----------------------------------------------------------------------------
// GET - Get Budget vs Actual comparison for a project
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

  const authResult = await requireOwnership('project', validId);

  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  const { companyId } = authResult.context!;

  // Get project with budgets and their items
  const project = await db.projects.findUnique({
    where: { id: validId },
    select: {
      id: true,
      name: true,
      estimatedValue: true,
      actualValue: true,
      physicalProgress: true,
      financialProgress: true,
      budgets: {
        where: { status: 'approved' },
        select: {
          id: true,
          name: true,
          totalValue: true,
          budget_items: {
            select: {
              id: true,
              description: true,
              unit: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              actualQuantity: true,
              actualTotal: true,
              compositionId: true,
              compositions: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!project) {
    return errorResponse('Projeto não encontrado.', 404);
  }

  // Get actual costs for this project
  const actualCosts = await db.actual_costs.findMany({
    where: { projectId: validId },
    select: {
      id: true,
      description: true,
      value: true,
      date: true,
      category: true,
      budgetItemId: true,
      documentRef: true,
    },
    orderBy: { date: 'desc' },
  });

  // Calculate budget totals
  const totalBudgeted = project.budgets.reduce((sum, budget) => {
    const value = typeof budget.totalValue === 'object' && 'toNumber' in budget.totalValue
      ? budget.totalValue.toNumber()
      : Number(budget.totalValue);
    return sum + value;
  }, 0);

  // Calculate actual costs total
  const totalActualCosts = actualCosts.reduce((sum, cost) => {
    const value = typeof cost.value === 'object' && 'toNumber' in cost.value
      ? cost.value.toNumber()
      : Number(cost.value);
    return sum + value;
  }, 0);

  // Process budget items with variance analysis
  const budgetItems = project.budgets.flatMap((budget) =>
    budget.budget_items.map((item) => {
      const plannedTotal = typeof item.totalPrice === 'object' && 'toNumber' in item.totalPrice
        ? item.totalPrice.toNumber()
        : Number(item.totalPrice);
      
      const actualTotal = item.actualTotal
        ? (typeof item.actualTotal === 'object' && 'toNumber' in item.actualTotal
            ? item.actualTotal.toNumber()
            : Number(item.actualTotal))
        : 0;

      // Calculate costs from actualCosts linked to this item
      const linkedCosts = actualCosts
        .filter((c) => c.budgetItemId === item.id)
        .reduce((sum, c) => {
          const v = typeof c.value === 'object' && 'toNumber' in c.value
            ? c.value.toNumber()
            : Number(c.value);
          return sum + v;
        }, 0);

      const finalActualTotal = actualTotal || linkedCosts;
      const variance = plannedTotal - finalActualTotal;
      const variancePercentage = plannedTotal > 0 ? (variance / plannedTotal) * 100 : 0;

      return {
        id: item.id,
        budgetId: budget.id,
        budgetName: budget.name,
        description: item.description,
        unit: item.unit,
        plannedQuantity: typeof item.quantity === 'object' && 'toNumber' in item.quantity
          ? item.quantity.toNumber()
          : Number(item.quantity),
        actualQuantity: item.actualQuantity
          ? (typeof item.actualQuantity === 'object' && 'toNumber' in item.actualQuantity
              ? item.actualQuantity.toNumber()
              : Number(item.actualQuantity))
          : null,
        unitPrice: typeof item.unitPrice === 'object' && 'toNumber' in item.unitPrice
          ? item.unitPrice.toNumber()
          : Number(item.unitPrice),
        plannedTotal,
        actualTotal: finalActualTotal,
        variance,
        variancePercentage,
        status: variance >= 0 ? 'under_budget' : 'over_budget',
        compositions: item.compositions,
      };
    })
  );

  // Calculate summary by category
  const summaryByCategory = budgetItems.reduce((acc, item) => {
    const category = item.compositions?.name || 'Outros';
    if (!acc[category]) {
      acc[category] = {
        category,
        plannedTotal: 0,
        actualTotal: 0,
        variance: 0,
        itemCount: 0,
      };
    }
    acc[category].plannedTotal += item.plannedTotal;
    acc[category].actualTotal += item.actualTotal;
    acc[category].variance += item.variance;
    acc[category].itemCount += 1;
    return acc;
  }, {} as Record<string, { category: string; plannedTotal: number; actualTotal: number; variance: number; itemCount: number }>);

  // Get physical-financial progress from schedules
  const schedules = await db.schedules.findMany({
    where: { projectId: validId },
    select: {
      id: true,
      name: true,
      progress: true,
      schedule_tasks: {
        select: {
          id: true,
          name: true,
          progress: true,
          physicalProgress: true,
          financialProgress: true,
          status: true,
          task_budget_links: {
            select: {
              percentage: true,
              budget_items: {
                select: {
                  id: true,
                  totalPrice: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Calculate earned value metrics
  const totalPlannedValue = totalBudgeted;
  const totalEarnedValue = budgetItems.reduce((sum, item) => {
    const progress = schedules.length > 0
      ? schedules[0].progress / 100
      : project.physicalProgress / 100;
    return sum + item.plannedTotal * progress;
  }, 0);

  const earnedValueMetrics = {
    plannedValue: totalPlannedValue,
    earnedValue: totalEarnedValue,
    actualCost: totalActualCosts,
    costVariance: totalEarnedValue - totalActualCosts,
    scheduleVariance: totalEarnedValue - (totalPlannedValue * (project.physicalProgress / 100)),
    costPerformanceIndex: totalActualCosts > 0 ? totalEarnedValue / totalActualCosts : 0,
    schedulePerformanceIndex: totalPlannedValue > 0 ? totalEarnedValue / totalPlannedValue : 0,
  };

  return successResponse({
    project: {
      id: project.id,
      name: project.name,
      estimatedValue: project.estimatedValue,
      actualValue: project.actualValue,
      physicalProgress: project.physicalProgress,
      financialProgress: project.financialProgress,
    },
    summary: {
      totalBudgeted,
      totalActualCosts,
      totalVariance: totalBudgeted - totalActualCosts,
      variancePercentage: totalBudgeted > 0 ? ((totalBudgeted - totalActualCosts) / totalBudgeted) * 100 : 0,
      budgetCount: project.budgets.length,
      itemCount: budgetItems.length,
    },
    budgetItems,
    summaryByCategory: Object.values(summaryByCategory),
    actualCosts: actualCosts.map((cost) => ({
      id: cost.id,
      description: cost.description,
      value: typeof cost.value === 'object' && 'toNumber' in cost.value
        ? cost.value.toNumber()
        : Number(cost.value),
      date: cost.date,
      category: cost.category,
      budgetItemId: cost.budgetItemId,
      documentRef: cost.documentRef,
    })),
    earnedValueMetrics,
    schedules: schedules.map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      progress: schedule.progress,
      taskCount: schedule.schedule_tasks.length,
    })),
  });
}
