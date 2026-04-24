// =============================================================================
// ConstrutorPro - Metrics & Analytics Service
// Serviço para coleta, agregação e análise de métricas de negócio
// =============================================================================

import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// =============================================================================
// Types
// =============================================================================

export type MetricPeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export type MetricCategory = 
  | 'financial' 
  | 'operational' 
  | 'projects' 
  | 'resources' 
  | 'quality'
  | 'productivity';

export interface MetricPoint {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface MetricSeries {
  name: string;
  category: MetricCategory;
  unit: string;
  data: MetricPoint[];
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface KPIMetric {
  id: string;
  name: string;
  category: MetricCategory;
  currentValue: number;
  previousValue: number | null;
  change: number;
  changePercent: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  isPositive: boolean;
  target?: number;
  progress?: number;
}

export interface DashboardMetrics {
  period: {
    start: Date;
    end: Date;
    label: string;
  };
  kpis: KPIMetric[];
  charts: {
    revenue: MetricSeries;
    expenses: MetricSeries;
    projects: MetricSeries;
    tasks: MetricSeries;
  };
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    profitMargin: number;
    activeProjects: number;
    completedTasks: number;
    pendingApprovals: number;
  };
}

export interface AnalyticsFilter {
  period: MetricPeriod;
  startDate?: Date;
  endDate?: Date;
  projectIds?: string[];
  categories?: MetricCategory[];
}

// =============================================================================
// Metrics Service
// =============================================================================

export const metricsService = {
  // ---------------------------------------------------------------------------
  // Dashboard Metrics
  // ---------------------------------------------------------------------------

  /**
   * Obtém métricas completas do dashboard
   */
  async getDashboardMetrics(
    companyId: string,
    filter: AnalyticsFilter
  ): Promise<DashboardMetrics> {
    const { startDate, endDate } = this.calculatePeriod(filter);

    const [
      revenueData,
      expensesData,
      projectMetrics,
      taskMetrics,
      kpis,
      summary,
    ] = await Promise.all([
      this.getRevenueMetrics(companyId, startDate, endDate),
      this.getExpenseMetrics(companyId, startDate, endDate),
      this.getProjectMetrics(companyId, startDate, endDate),
      this.getTaskMetrics(companyId, startDate, endDate),
      this.getKPIs(companyId, startDate, endDate),
      this.getSummary(companyId, startDate, endDate),
    ]);

    return {
      period: {
        start: startDate,
        end: endDate,
        label: this.getPeriodLabel(filter.period),
      },
      kpis,
      charts: {
        revenue: revenueData,
        expenses: expensesData,
        projects: projectMetrics,
        tasks: taskMetrics,
      },
      summary,
    };
  },

  // ---------------------------------------------------------------------------
  // KPIs
  // ---------------------------------------------------------------------------

  /**
   * Calcula todos os KPIs
   */
  async getKPIs(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<KPIMetric[]> {
    const previousPeriod = this.getPreviousPeriod(startDate, endDate);

    const [
      revenueKPI,
      profitKPI,
      projectsKPI,
      tasksKPI,
      clientsKPI,
      efficiencyKPI,
    ] = await Promise.all([
      this.calculateRevenueKPI(companyId, startDate, endDate, previousPeriod.start, previousPeriod.end),
      this.calculateProfitKPI(companyId, startDate, endDate, previousPeriod.start, previousPeriod.end),
      this.calculateProjectsKPI(companyId, startDate, endDate, previousPeriod.start, previousPeriod.end),
      this.calculateTasksKPI(companyId, startDate, endDate, previousPeriod.start, previousPeriod.end),
      this.calculateClientsKPI(companyId, startDate, endDate, previousPeriod.start, previousPeriod.end),
      this.calculateEfficiencyKPI(companyId, startDate, endDate, previousPeriod.start, previousPeriod.end),
    ]);

    return [revenueKPI, profitKPI, projectsKPI, tasksKPI, clientsKPI, efficiencyKPI];
  },

  /**
   * KPI de Receita
   */
  async calculateRevenueKPI(
    companyId: string,
    startDate: Date,
    endDate: Date,
    prevStart: Date,
    prevEnd: Date
  ): Promise<KPIMetric> {
    const [current, previous] = await Promise.all([
      this.getTotalRevenue(companyId, startDate, endDate),
      this.getTotalRevenue(companyId, prevStart, prevEnd),
    ]);

    return this.createKPI('revenue', 'financial', current, previous, 'BRL');
  },

  /**
   * KPI de Lucro
   */
  async calculateProfitKPI(
    companyId: string,
    startDate: Date,
    endDate: Date,
    prevStart: Date,
    prevEnd: Date
  ): Promise<KPIMetric> {
    const [currentRevenue, currentExpenses, prevRevenue, prevExpenses] = await Promise.all([
      this.getTotalRevenue(companyId, startDate, endDate),
      this.getTotalExpenses(companyId, startDate, endDate),
      this.getTotalRevenue(companyId, prevStart, prevEnd),
      this.getTotalExpenses(companyId, prevStart, prevEnd),
    ]);

    const current = currentRevenue - currentExpenses;
    const previous = prevRevenue - prevExpenses;

    return this.createKPI('profit', 'financial', current, previous, 'BRL');
  },

  /**
   * KPI de Projetos
   */
  async calculateProjectsKPI(
    companyId: string,
    startDate: Date,
    endDate: Date,
    prevStart: Date,
    prevEnd: Date
  ): Promise<KPIMetric> {
    const [current, previous] = await Promise.all([
      db.projects.count({
        where: {
          companyId,
          status: 'active',
          createdAt: { lte: endDate },
        },
      }),
      db.projects.count({
        where: {
          companyId,
          status: 'active',
          createdAt: { lte: prevEnd },
        },
      }),
    ]);

    return this.createKPI('active_projects', 'projects', current, previous, '');
  },

  /**
   * KPI de Tarefas
   */
  async calculateTasksKPI(
    companyId: string,
    startDate: Date,
    endDate: Date,
    prevStart: Date,
    prevEnd: Date
  ): Promise<KPIMetric> {
    const [current, previous] = await Promise.all([
      db.schedule_tasks.count({
        where: {
          status: 'completed',
          schedules: { companyId },
          updatedAt: { gte: startDate, lte: endDate },
        },
      }),
      db.schedule_tasks.count({
        where: {
          status: 'completed',
          schedules: { companyId },
          updatedAt: { gte: prevStart, lte: prevEnd },
        },
      }),
    ]);

    return this.createKPI('completed_tasks', 'productivity', current, previous, '');
  },

  /**
   * KPI de Clientes
   */
  async calculateClientsKPI(
    companyId: string,
    startDate: Date,
    endDate: Date,
    prevStart: Date,
    prevEnd: Date
  ): Promise<KPIMetric> {
    const [current, previous] = await Promise.all([
      db.clients.count({
        where: {
          companyId,
          status: 'active',
        },
      }),
      db.clients.count({
        where: {
          companyId,
          status: 'active',
          createdAt: { lt: startDate },
        },
      }),
    ]);

    return this.createKPI('active_clients', 'resources', current, previous, '');
  },

  /**
   * KPI de Eficiência
   */
  async calculateEfficiencyKPI(
    companyId: string,
    startDate: Date,
    endDate: Date,
    prevStart: Date,
    prevEnd: Date
  ): Promise<KPIMetric> {
    // Calcula eficiência como % de tarefas no prazo
    const [currentTotal, currentOnTime, prevTotal, prevOnTime] = await Promise.all([
      db.schedule_tasks.count({
        where: {
          schedules: { companyId },
          status: 'completed',
          updatedAt: { gte: startDate, lte: endDate },
        },
      }),
      db.schedule_tasks.count({
        where: {
          schedules: { companyId },
          status: 'completed',
          updatedAt: { gte: startDate, lte: endDate },
          endDate: { lte: new Date() },
        },
      }),
      db.schedule_tasks.count({
        where: {
          schedules: { companyId },
          status: 'completed',
          updatedAt: { gte: prevStart, lte: prevEnd },
        },
      }),
      db.schedule_tasks.count({
        where: {
          schedules: { companyId },
          status: 'completed',
          updatedAt: { gte: prevStart, lte: prevEnd },
          endDate: { lte: new Date() },
        },
      }),
    ]);

    const current = currentTotal > 0 ? (currentOnTime / currentTotal) * 100 : 0;
    const previous = prevTotal > 0 ? (prevOnTime / prevTotal) * 100 : 0;

    const kpi = this.createKPI('efficiency', 'quality', current, previous, '%');
    kpi.target = 90;
    kpi.progress = current / 90 * 100;

    return kpi;
  },

  // ---------------------------------------------------------------------------
  // Metrics Series
  // ---------------------------------------------------------------------------

  /**
   * Métricas de Receita
   */
  async getRevenueMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricSeries> {
    const transactions = await db.transactions.findMany({
      where: {
        companyId,
        type: 'income',
        date: { gte: startDate, lte: endDate },
      },
      select: {
        date: true,
        value: true,
      },
      orderBy: { date: 'asc' },
    });

    const dailyTotals = this.aggregateByDay(transactions, 'value');

    return {
      name: 'Receitas',
      category: 'financial',
      unit: 'BRL',
      data: dailyTotals,
      aggregation: 'sum',
    };
  },

  /**
   * Métricas de Despesas
   */
  async getExpenseMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricSeries> {
    const transactions = await db.transactions.findMany({
      where: {
        companyId,
        type: 'expense',
        date: { gte: startDate, lte: endDate },
      },
      select: {
        date: true,
        value: true,
      },
      orderBy: { date: 'asc' },
    });

    const dailyTotals = this.aggregateByDay(transactions, 'value');

    return {
      name: 'Despesas',
      category: 'financial',
      unit: 'BRL',
      data: dailyTotals,
      aggregation: 'sum',
    };
  },

  /**
   * Métricas de Projetos
   */
  async getProjectMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricSeries> {
    const projects = await db.projects.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyTotals = this.aggregateByDayCount(projects, 'createdAt');

    return {
      name: 'Novos Projetos',
      category: 'projects',
      unit: '',
      data: dailyTotals,
      aggregation: 'count',
    };
  },

  /**
   * Métricas de Tarefas
   */
  async getTaskMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricSeries> {
    const tasks = await db.schedule_tasks.findMany({
      where: {
        schedules: { companyId },
        updatedAt: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      select: {
        updatedAt: true,
      },
      orderBy: { updatedAt: 'asc' },
    });

    const dailyTotals = this.aggregateByDayCount(tasks, 'updatedAt');

    return {
      name: 'Tarefas Concluídas',
      category: 'productivity',
      unit: '',
      data: dailyTotals,
      aggregation: 'count',
    };
  },

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  async getSummary(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DashboardMetrics['summary']> {
    const [
      totalRevenue,
      totalExpenses,
      activeProjects,
      completedTasks,
      pendingApprovals,
    ] = await Promise.all([
      this.getTotalRevenue(companyId, startDate, endDate),
      this.getTotalExpenses(companyId, startDate, endDate),
      db.projects.count({
        where: { companyId, status: 'active' },
      }),
      db.schedule_tasks.count({
        where: {
          schedules: { companyId },
          status: 'completed',
          updatedAt: { gte: startDate, lte: endDate },
        },
      }),
      db.approval_requests.count({
        where: {
          companyId,
          status: 'pending',
        },
      }),
    ]);

    const profitMargin = totalRevenue > 0 
      ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 
      : 0;

    return {
      totalRevenue,
      totalExpenses,
      profitMargin,
      activeProjects,
      completedTasks,
      pendingApprovals,
    };
  },

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  async getTotalRevenue(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db.transactions.aggregate({
      where: {
        companyId,
        type: 'income',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { value: true },
    });

    return Number(result._sum.value || 0);
  },

  async getTotalExpenses(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db.transactions.aggregate({
      where: {
        companyId,
        type: 'expense',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { value: true },
    });

    return Number(result._sum.value || 0);
  },

  createKPI(
    id: string,
    category: MetricCategory,
    current: number,
    previous: number | null,
    unit: string
  ): KPIMetric {
    const change = previous !== null ? current - previous : 0;
    const changePercent = previous !== null && previous !== 0 
      ? (change / Math.abs(previous)) * 100 
      : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 1) {
      trend = changePercent > 0 ? 'up' : 'down';
    }

    // Para métricas financeiras e produtividade, aumento é positivo
    // Para despesas ou tempo, diminuição seria positiva
    const isPositive = category === 'financial' || category === 'productivity'
      ? change >= 0
      : change <= 0;

    return {
      id,
      name: this.getKPIName(id),
      category,
      currentValue: current,
      previousValue: previous,
      change,
      changePercent,
      unit,
      trend,
      isPositive,
    };
  },

  getKPIName(id: string): string {
    const names: Record<string, string> = {
      revenue: 'Receita Total',
      profit: 'Lucro Líquido',
      active_projects: 'Projetos Ativos',
      completed_tasks: 'Tarefas Concluídas',
      active_clients: 'Clientes Ativos',
      efficiency: 'Eficiência',
    };
    return names[id] || id;
  },

  calculatePeriod(filter: AnalyticsFilter): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    const endDate = filter.endDate || now;

    if (filter.startDate) {
      startDate = filter.startDate;
    } else {
      switch (filter.period) {
        case 'hour':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    return { startDate, endDate };
  },

  getPreviousPeriod(startDate: Date, endDate: Date): { start: Date; end: Date } {
    const duration = endDate.getTime() - startDate.getTime();
    return {
      end: new Date(startDate.getTime() - 1),
      start: new Date(startDate.getTime() - duration - 1),
    };
  },

  getPeriodLabel(period: MetricPeriod): string {
    const labels: Record<MetricPeriod, string> = {
      hour: 'Última hora',
      day: 'Último dia',
      week: 'Última semana',
      month: 'Último mês',
      quarter: 'Último trimestre',
      year: 'Último ano',
    };
    return labels[period];
  },

  aggregateByDay(
    items: Array<{ date?: Date; updatedAt?: Date; value?: Decimal | null }>,
    valueField: string
  ): MetricPoint[] {
    const dayMap = new Map<string, number>();

    for (const item of items) {
      const date = item.date || item.updatedAt;
      if (date) {
        const dayKey = date.toISOString().split('T')[0];
        const value = Number(item[valueField as keyof typeof item] || 0);
        dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + value);
      }
    }

    return Array.from(dayMap.entries())
      .map(([date, value]) => ({
        timestamp: new Date(date),
        value,
        label: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  },

  aggregateByDayCount(
    items: Array<{ createdAt?: Date; updatedAt?: Date }>,
    dateField: string
  ): MetricPoint[] {
    const dayMap = new Map<string, number>();

    for (const item of items) {
      const date = item[dateField as keyof typeof item] as Date | undefined;
      if (date) {
        const dayKey = date.toISOString().split('T')[0];
        dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
      }
    }

    return Array.from(dayMap.entries())
      .map(([date, value]) => ({
        timestamp: new Date(date),
        value,
        label: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  },

  // ---------------------------------------------------------------------------
  // Trend Analysis
  // ---------------------------------------------------------------------------

  /**
   * Analisa tendência de uma métrica
   */
  analyzeTrend(data: MetricPoint[]): {
    trend: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    r2: number;
    forecast: number;
  } {
    if (data.length < 2) {
      return { trend: 'stable', slope: 0, r2: 0, forecast: 0 };
    }

    // Simple linear regression
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((acc, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return acc + Math.pow(yi - predicted, 2);
    }, 0);
    const r2 = 1 - ssResidual / ssTotal;

    // Forecast next value
    const forecast = slope * n + intercept;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(slope) > 0.01 * yMean) {
      trend = slope > 0 ? 'increasing' : 'decreasing';
    }

    return { trend, slope, r2, forecast };
  },

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  /**
   * Exporta métricas para CSV
   */
  exportToCSV(metrics: DashboardMetrics): string {
    const rows: string[][] = [];

    // Header
    rows.push(['Relatório de Métricas', metrics.period.label]);
    rows.push([]);

    // Summary
    rows.push(['RESUMO']);
    rows.push(['Receita Total', metrics.summary.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);
    rows.push(['Despesas Total', metrics.summary.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);
    rows.push(['Margem de Lucro', `${metrics.summary.profitMargin.toFixed(2)}%`]);
    rows.push(['Projetos Ativos', String(metrics.summary.activeProjects)]);
    rows.push(['Tarefas Concluídas', String(metrics.summary.completedTasks)]);
    rows.push(['Aprovações Pendentes', String(metrics.summary.pendingApprovals)]);
    rows.push([]);

    // KPIs
    rows.push(['KPIs']);
    rows.push(['Nome', 'Valor Atual', 'Valor Anterior', 'Variação %', 'Tendência']);
    for (const kpi of metrics.kpis) {
      rows.push([
        kpi.name,
        `${kpi.currentValue.toLocaleString('pt-BR')} ${kpi.unit}`,
        kpi.previousValue !== null ? `${kpi.previousValue.toLocaleString('pt-BR')} ${kpi.unit}` : '-',
        `${kpi.changePercent.toFixed(2)}%`,
        kpi.trend,
      ]);
    }
    rows.push([]);

    // Revenue Chart Data
    rows.push(['RECEITAS']);
    rows.push(['Data', 'Valor']);
    for (const point of metrics.charts.revenue.data) {
      rows.push([point.label || point.timestamp.toISOString(), String(point.value)]);
    }

    return rows.map(row => row.join(';')).join('\n');
  },
};
