// =============================================================================
// ConstrutorPro - PDF Report Export API
// API para exportação de relatórios em formato PDF
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { db } from '@/lib/db';
import {
  generateProjectsPDF,
  generateFinancialPDF,
  generateResourcesPDF,
  generateActivitiesPDF,
  type ProjectReportData,
  type FinancialReportData,
  type ResourcesReportData,
  type ActivitiesReportData,
} from '@/lib/pdf';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

// =============================================================================
// Types
// =============================================================================

type ReportType = 'projects' | 'financial' | 'resources' | 'activities';

// =============================================================================
// Helper Functions
// =============================================================================

function filterByDateRange<T extends Record<string, unknown>>(
  items: T[],
  dateField: keyof T,
  dateFrom?: string,
  dateTo?: string
): T[] {
  if (!dateFrom && !dateTo) return items;

  return items.filter((item) => {
    const itemDate = item[dateField] as string | Date | undefined;
    if (!itemDate) return false;

    try {
      const date = typeof itemDate === 'string' ? parseISO(itemDate) : itemDate;

      if (dateFrom && dateTo) {
        return isWithinInterval(date, {
          start: startOfDay(parseISO(dateFrom)),
          end: endOfDay(parseISO(dateTo)),
        });
      }

      if (dateFrom) {
        return date >= startOfDay(parseISO(dateFrom));
      }

      if (dateTo) {
        return date <= endOfDay(parseISO(dateTo));
      }

      return true;
    } catch {
      return false;
    }
  });
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    material: 'Material',
    labor: 'Mão de Obra',
    equipment: 'Equipamento',
    service: 'Serviço',
    tax: 'Imposto',
    administrative: 'Administrativo',
    other: 'Outros',
  };
  return labels[category] || category;
}

// =============================================================================
// Data Fetchers
// =============================================================================

async function getProjectsData(
  companyId: string,
  dateFrom?: string,
  dateTo?: string,
  projectId?: string
): Promise<ProjectReportData> {
  const where = {
    companyId,
    ...(projectId ? { id: projectId } : {}),
  };

  const projects = await db.projects.findMany({
    where,
    include: {
      clients: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Apply date filter
  const filteredProjects = filterByDateRange(
    projects.map((p) => ({ ...p, startDate: p.startDate })),
    'startDate',
    dateFrom,
    dateTo
  );

  const summary = {
    total: filteredProjects.length,
    active: filteredProjects.filter((p) => p.status === 'active').length,
    completed: filteredProjects.filter((p) => p.status === 'completed').length,
    delayed: filteredProjects.filter((p) => p.status === 'delayed').length,
    totalValue: filteredProjects.reduce((sum, p) => sum + (p.estimatedValue?.toNumber() || 0), 0),
  };

  return {
    metadata: {
      title: 'Relatório de Projetos',
      companyName: 'ConstrutorPro',
      generatedBy: 'Sistema',
      generatedAt: new Date(),
      ...(dateFrom && dateTo ? {
        period: { start: new Date(dateFrom), end: new Date(dateTo) },
      } : {}),
    },
    summary,
    projects: filteredProjects.map((p) => ({
      code: p.code || '-',
      name: p.name,
      client: p.clients?.name || '-',
      status: p.status,
      startDate: p.startDate || undefined,
      endDate: p.endDate || undefined,
      estimatedValue: p.estimatedValue?.toNumber() || 0,
      actualValue: p.actualValue?.toNumber() || 0,
      physicalProgress: p.physicalProgress || 0,
      financialProgress: p.financialProgress || 0,
    })),
  };
}

async function getFinancialData(
  companyId: string,
  dateFrom?: string,
  dateTo?: string,
  projectId?: string
): Promise<FinancialReportData> {
  const where = {
    companyId,
    ...(projectId ? { projectId } : {}),
  };

  const transactions = await db.transactions.findMany({
    where,
    include: {
      projects: {
        select: { name: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  // Apply date filter
  const filteredTransactions = filterByDateRange(transactions, 'date', dateFrom, dateTo);

  // Calculate summary
  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.value.toNumber(), 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.value.toNumber(), 0);

  const pendingIncome = filteredTransactions
    .filter((t) => t.type === 'income' && t.status === 'pending')
    .reduce((sum, t) => sum + t.value.toNumber(), 0);

  const pendingExpenses = filteredTransactions
    .filter((t) => t.type === 'expense' && t.status === 'pending')
    .reduce((sum, t) => sum + t.value.toNumber(), 0);

  // Category breakdown for expenses
  const expensesByCategory = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      const cat = t.category || 'other';
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += t.value.toNumber();
      return acc;
    }, {} as Record<string, number>);

  const categoryBreakdown = Object.entries(expensesByCategory).map(([category, value]) => ({
    category: getCategoryLabel(category),
    value,
    percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
  }));

  return {
    metadata: {
      title: 'Relatório Financeiro',
      companyName: 'ConstrutorPro',
      generatedBy: 'Sistema',
      generatedAt: new Date(),
      ...(dateFrom && dateTo ? {
        period: { start: new Date(dateFrom), end: new Date(dateTo) },
      } : {}),
    },
    summary: {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      pendingIncome,
      pendingExpenses,
    },
    transactions: filteredTransactions.map((t) => ({
      date: t.date,
      type: t.type as 'income' | 'expense',
      category: t.category || 'other',
      description: t.description,
      value: t.value.toNumber(),
      dueDate: t.dueDate || undefined,
      status: t.status,
      project: t.projects?.name,
    })),
    categoryBreakdown,
  };
}

async function getResourcesData(companyId: string): Promise<ResourcesReportData> {
  const materials = await db.materials.findMany({
    where: { companyId },
    include: {
      suppliers: {
        select: { name: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const totalValue = materials.reduce(
    (sum, m) => sum + (m.unitCost?.toNumber() || 0) * (m.stockQuantity?.toNumber() || 0),
    0
  );

  const lowStockCount = materials.filter(
    (m) =>
      m.stockQuantity !== null &&
      m.minStock !== null &&
      m.stockQuantity.toNumber() < m.minStock.toNumber()
  ).length;

  return {
    metadata: {
      title: 'Relatório de Recursos',
      companyName: 'ConstrutorPro',
      generatedBy: 'Sistema',
      generatedAt: new Date(),
    },
    summary: {
      totalMaterials: materials.length,
      lowStock: lowStockCount,
      totalValue,
    },
    materials: materials.map((m) => ({
      code: m.code,
      name: m.name,
      category: m.category || '-',
      unit: m.unit,
      unitCost: m.unitCost?.toNumber() || 0,
      stockQuantity: m.stockQuantity?.toNumber() || null,
      minStock: m.minStock?.toNumber() || null,
      supplier: m.suppliers?.name,
    })),
  };
}

async function getActivitiesData(
  companyId: string,
  dateFrom?: string,
  dateTo?: string,
  projectId?: string
): Promise<ActivitiesReportData> {
  const where = {
    companyId,
    ...(projectId ? { projectId } : {}),
  };

  const dailyLogs = await db.daily_logs.findMany({
    where,
    include: {
      projects: {
        select: { name: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  // Apply date filter
  const filteredLogs = filterByDateRange(dailyLogs, 'date', dateFrom, dateTo);

  const workedDays = new Set(filteredLogs.map((l) => l.date.toDateString())).size;
  const totalWorkers = filteredLogs.reduce((sum, l) => sum + (l.workersCount || 0), 0);
  const projectsInvolved = new Set(filteredLogs.map((l) => l.projectId)).size;

  return {
    metadata: {
      title: 'Relatório de Atividades',
      companyName: 'ConstrutorPro',
      generatedBy: 'Sistema',
      generatedAt: new Date(),
      ...(dateFrom && dateTo ? {
        period: { start: new Date(dateFrom), end: new Date(dateTo) },
      } : {}),
    },
    summary: {
      totalLogs: filteredLogs.length,
      workedDays,
      totalWorkers,
      projectsInvolved,
    },
    dailyLogs: filteredLogs.map((l) => ({
      date: l.date,
      project: l.projects?.name || '-',
      weather: l.weather || 'sunny',
      workersCount: l.workersCount || 0,
      summary: l.summary || '',
      observations: l.observations || undefined,
    })),
  };
}

// =============================================================================
// API Route Handler
// =============================================================================

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const { searchParams } = new URL(request.url);
  const reportType = (searchParams.get('type') || 'projects') as ReportType;
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;
  const projectId = searchParams.get('projectId') || undefined;

  try {
    let pdfBuffer: Buffer;
    let filename: string;

    switch (reportType) {
      case 'projects': {
        const data = await getProjectsData(context!.companyId, dateFrom, dateTo, projectId);
        pdfBuffer = await generateProjectsPDF(data);
        filename = `relatorio_projetos_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        break;
      }

      case 'financial': {
        const data = await getFinancialData(context!.companyId, dateFrom, dateTo, projectId);
        pdfBuffer = await generateFinancialPDF(data);
        filename = `relatorio_financeiro_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        break;
      }

      case 'resources': {
        const data = await getResourcesData(context!.companyId);
        pdfBuffer = await generateResourcesPDF(data);
        filename = `relatorio_recursos_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        break;
      }

      case 'activities': {
        const data = await getActivitiesData(context!.companyId, dateFrom, dateTo, projectId);
        pdfBuffer = await generateActivitiesPDF(data);
        filename = `relatorio_atividades_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        break;
      }

      default:
        return errorResponse('Tipo de relatório inválido', 400);
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return errorResponse('Erro ao gerar relatório PDF', 500);
  }
}
