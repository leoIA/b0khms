// =============================================================================
// ConstrutorPro - Dashboard API
// =============================================================================

import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { db } from '@/lib/db';

export async function GET() {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;

  try {
    // Build company filter
    const companyFilter = isMasterAdmin ? {} : { companyId };

    // Get project stats
    const projects = await db.projects.findMany({
      where: companyFilter,
      select: {
        id: true,
        name: true,
        status: true,
        physicalProgress: true,
        financialProgress: true,
        estimatedValue: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const projectCounts = await db.projects.groupBy({
      by: ['status'],
      where: companyFilter,
      _count: true,
    });

    // Count delayed projects: active projects with endDate in the past OR with delayed schedule tasks
    const now = new Date();

    // Get active projects with endDate in the past
    const activeProjectsWithPastEndDate = await db.projects.findMany({
      where: {
        ...companyFilter,
        status: 'active',
        endDate: { lt: now },
      },
      select: { id: true },
    });

    // Get projects with delayed schedule tasks
    const projectsWithDelayedTasks = await db.projects.findMany({
      where: {
        ...companyFilter,
        status: 'active',
        schedules: {
          some: {
            schedule_tasks: {
              some: {
                status: 'delayed',
              },
            },
          },
        },
      },
      select: { id: true },
    });

    // Combine and deduplicate project IDs
    const delayedProjectIds = new Set([
      ...activeProjectsWithPastEndDate.map((p) => p.id),
      ...projectsWithDelayedTasks.map((p) => p.id),
    ]);

    const projectStats = {
      total: projectCounts.reduce((acc, p) => acc + p._count, 0),
      active: projectCounts.find((p) => p.status === 'active')?._count || 0,
      completed: projectCounts.find((p) => p.status === 'completed')?._count || 0,
      planning: projectCounts.find((p) => p.status === 'planning')?._count || 0,
      paused: projectCounts.find((p) => p.status === 'paused')?._count || 0,
      delayed: delayedProjectIds.size,
    };

    // Get client stats
    const clientStats = await db.clients.groupBy({
      by: ['status'],
      where: companyFilter,
      _count: true,
    });

    const clients = {
      total: clientStats.reduce((acc, c) => acc + c._count, 0),
      active: clientStats.find((c) => c.status === 'active')?._count || 0,
    };

    // Get supplier stats
    const supplierStats = await db.suppliers.groupBy({
      by: ['status'],
      where: companyFilter,
      _count: true,
    });

    const suppliers = {
      total: supplierStats.reduce((acc, s) => acc + s._count, 0),
      active: supplierStats.find((s) => s.status === 'active')?._count || 0,
    };

    // Get financial stats using aggregation (avoids N+1 query issue)
    const [
      projectedRevenueResult,
      actualRevenueResult,
      projectedCostsResult,
      actualCostsResult,
    ] = await Promise.all([
      db.transactions.aggregate({
        where: { ...companyFilter, type: 'income' },
        _sum: { value: true },
      }),
      db.transactions.aggregate({
        where: { ...companyFilter, type: 'income', status: 'paid' },
        _sum: { value: true },
      }),
      db.transactions.aggregate({
        where: { ...companyFilter, type: 'expense' },
        _sum: { value: true },
      }),
      db.transactions.aggregate({
        where: { ...companyFilter, type: 'expense', status: 'paid' },
        _sum: { value: true },
      }),
    ]);

    const projectedRevenue = Number(projectedRevenueResult._sum.value || 0);
    const actualRevenue = Number(actualRevenueResult._sum.value || 0);
    const projectedCosts = Number(projectedCostsResult._sum.value || 0);
    const actualCosts = Number(actualCostsResult._sum.value || 0);

    const profitMargin = actualRevenue > 0
      ? ((actualRevenue - actualCosts) / actualRevenue) * 100
      : 0;

    const financial = {
      projectedRevenue,
      actualRevenue,
      projectedCosts,
      actualCosts,
      profitMargin,
    };

    // Format recent projects
    const recentProjects = projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      physicalProgress: p.physicalProgress,
      financialProgress: p.financialProgress,
      estimatedValue: Number(p.estimatedValue),
    }));

    return NextResponse.json({
      stats: {
        projects: projectStats,
        clients,
        suppliers,
        financial,
      },
      recentProjects,
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    return errorResponse('Erro ao carregar dados do dashboard', 500);
  }
}
