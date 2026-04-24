// =============================================================================
// ConstrutorPro - Metrics Service Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { metricsService } from '../metrics-service';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    transactions: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    projects: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    clients: {
      count: vi.fn(),
    },
    schedule_tasks: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    approval_requests: {
      count: vi.fn(),
    },
  },
}));

import { db } from '@/lib/db';

describe('MetricsService', () => {
  const mockCompanyId = 'test-company-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Period Calculation
  // ---------------------------------------------------------------------------

  describe('calculatePeriod', () => {
    it('should calculate hour period correctly', () => {
      const result = metricsService.calculatePeriod({ period: 'hour' });
      const duration = result.endDate.getTime() - result.startDate.getTime();
      expect(duration).toBeLessThanOrEqual(60 * 60 * 1000 + 1000);
    });

    it('should calculate day period correctly', () => {
      const result = metricsService.calculatePeriod({ period: 'day' });
      const duration = result.endDate.getTime() - result.startDate.getTime();
      expect(duration).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 1000);
    });

    it('should calculate week period correctly', () => {
      const result = metricsService.calculatePeriod({ period: 'week' });
      const duration = result.endDate.getTime() - result.startDate.getTime();
      expect(duration).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 1000);
    });

    it('should calculate month period correctly', () => {
      const result = metricsService.calculatePeriod({ period: 'month' });
      const duration = result.endDate.getTime() - result.startDate.getTime();
      expect(duration).toBeLessThanOrEqual(31 * 24 * 60 * 60 * 1000);
    });

    it('should use custom dates when provided', () => {
      const customStart = new Date('2024-01-01');
      const customEnd = new Date('2024-01-31');
      
      const result = metricsService.calculatePeriod({
        period: 'month',
        startDate: customStart,
        endDate: customEnd,
      });

      expect(result.startDate.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(result.endDate.toISOString().split('T')[0]).toBe('2024-01-31');
    });
  });

  // ---------------------------------------------------------------------------
  // Period Labels
  // ---------------------------------------------------------------------------

  describe('getPeriodLabel', () => {
    it('should return correct labels for each period', () => {
      expect(metricsService.getPeriodLabel('hour')).toBe('Última hora');
      expect(metricsService.getPeriodLabel('day')).toBe('Último dia');
      expect(metricsService.getPeriodLabel('week')).toBe('Última semana');
      expect(metricsService.getPeriodLabel('month')).toBe('Último mês');
      expect(metricsService.getPeriodLabel('quarter')).toBe('Último trimestre');
      expect(metricsService.getPeriodLabel('year')).toBe('Último ano');
    });
  });

  // ---------------------------------------------------------------------------
  // KPI Creation
  // ---------------------------------------------------------------------------

  describe('createKPI', () => {
    it('should create KPI with positive trend', () => {
      const kpi = metricsService.createKPI('revenue', 'financial', 1000, 800, 'BRL');

      expect(kpi.currentValue).toBe(1000);
      expect(kpi.previousValue).toBe(800);
      expect(kpi.change).toBe(200);
      expect(kpi.changePercent).toBe(25);
      expect(kpi.trend).toBe('up');
      expect(kpi.isPositive).toBe(true);
    });

    it('should create KPI with negative trend', () => {
      const kpi = metricsService.createKPI('revenue', 'financial', 800, 1000, 'BRL');

      expect(kpi.currentValue).toBe(800);
      expect(kpi.change).toBe(-200);
      expect(kpi.changePercent).toBe(-20);
      expect(kpi.trend).toBe('down');
      expect(kpi.isPositive).toBe(false);
    });

    it('should create KPI with stable trend when change is minimal', () => {
      const kpi = metricsService.createKPI('revenue', 'financial', 1000, 1005, 'BRL');

      expect(kpi.trend).toBe('stable');
    });

    it('should handle null previous value', () => {
      const kpi = metricsService.createKPI('revenue', 'financial', 1000, null, 'BRL');

      expect(kpi.currentValue).toBe(1000);
      expect(kpi.previousValue).toBeNull();
      expect(kpi.change).toBe(0);
      expect(kpi.changePercent).toBe(0);
    });

    it('should handle zero previous value', () => {
      const kpi = metricsService.createKPI('revenue', 'financial', 1000, 0, 'BRL');

      expect(kpi.change).toBe(1000);
      expect(kpi.changePercent).toBe(0); // Division by zero returns 0
    });
  });

  // ---------------------------------------------------------------------------
  // Previous Period Calculation
  // ---------------------------------------------------------------------------

  describe('getPreviousPeriod', () => {
    it('should calculate previous period correctly', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-22');

      const result = metricsService.getPreviousPeriod(startDate, endDate);

      expect(result.end.toISOString().split('T')[0]).toBe('2024-01-14');
      expect(result.start.toISOString().split('T')[0]).toBe('2024-01-07');
    });
  });

  // ---------------------------------------------------------------------------
  // Trend Analysis
  // ---------------------------------------------------------------------------

  describe('analyzeTrend', () => {
    it('should identify increasing trend', () => {
      const data = [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 200 },
        { timestamp: new Date('2024-01-03'), value: 300 },
        { timestamp: new Date('2024-01-04'), value: 400 },
        { timestamp: new Date('2024-01-05'), value: 500 },
      ];

      const result = metricsService.analyzeTrend(data);

      expect(result.trend).toBe('increasing');
      expect(result.slope).toBeGreaterThan(0);
    });

    it('should identify decreasing trend', () => {
      const data = [
        { timestamp: new Date('2024-01-01'), value: 500 },
        { timestamp: new Date('2024-01-02'), value: 400 },
        { timestamp: new Date('2024-01-03'), value: 300 },
        { timestamp: new Date('2024-01-04'), value: 200 },
        { timestamp: new Date('2024-01-05'), value: 100 },
      ];

      const result = metricsService.analyzeTrend(data);

      expect(result.trend).toBe('decreasing');
      expect(result.slope).toBeLessThan(0);
    });

    it('should identify stable trend', () => {
      const data = [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 101 },
        { timestamp: new Date('2024-01-03'), value: 100 },
        { timestamp: new Date('2024-01-04'), value: 99 },
        { timestamp: new Date('2024-01-05'), value: 100 },
      ];

      const result = metricsService.analyzeTrend(data);

      expect(result.trend).toBe('stable');
    });

    it('should handle single data point', () => {
      const data = [{ timestamp: new Date('2024-01-01'), value: 100 }];

      const result = metricsService.analyzeTrend(data);

      expect(result.trend).toBe('stable');
      expect(result.slope).toBe(0);
    });

    it('should handle empty data', () => {
      const result = metricsService.analyzeTrend([]);

      expect(result.trend).toBe('stable');
      expect(result.slope).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Aggregation
  // ---------------------------------------------------------------------------

  describe('aggregateByDay', () => {
    it('should aggregate values by day', () => {
      const items = [
        { date: new Date('2024-01-01T10:00:00'), value: 100 },
        { date: new Date('2024-01-01T14:00:00'), value: 200 },
        { date: new Date('2024-01-02T10:00:00'), value: 300 },
      ];

      const result = metricsService.aggregateByDay(items, 'value');

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(300); // Day 1 total
      expect(result[1].value).toBe(300); // Day 2 total
    });

    it('should sort by date', () => {
      const items = [
        { date: new Date('2024-01-03'), value: 300 },
        { date: new Date('2024-01-01'), value: 100 },
        { date: new Date('2024-01-02'), value: 200 },
      ];

      const result = metricsService.aggregateByDay(items, 'value');

      expect(result[0].timestamp.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(result[1].timestamp.toISOString().split('T')[0]).toBe('2024-01-02');
      expect(result[2].timestamp.toISOString().split('T')[0]).toBe('2024-01-03');
    });
  });

  describe('aggregateByDayCount', () => {
    it('should count items by day', () => {
      const items = [
        { createdAt: new Date('2024-01-01T10:00:00') },
        { createdAt: new Date('2024-01-01T14:00:00') },
        { createdAt: new Date('2024-01-02T10:00:00') },
        { createdAt: new Date('2024-01-02T12:00:00') },
        { createdAt: new Date('2024-01-02T16:00:00') },
      ];

      const result = metricsService.aggregateByDayCount(items, 'createdAt');

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(2); // Day 1 count
      expect(result[1].value).toBe(3); // Day 2 count
    });
  });

  // ---------------------------------------------------------------------------
  // CSV Export
  // ---------------------------------------------------------------------------

  describe('exportToCSV', () => {
    it('should export metrics to CSV format', () => {
      const metrics = {
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
          label: 'Janeiro 2024',
        },
        kpis: [
          {
            id: 'revenue',
            name: 'Receita Total',
            category: 'financial' as const,
            currentValue: 100000,
            previousValue: 80000,
            change: 20000,
            changePercent: 25,
            unit: 'BRL',
            trend: 'up' as const,
            isPositive: true,
          },
        ],
        charts: {
          revenue: {
            name: 'Receitas',
            category: 'financial' as const,
            unit: 'BRL',
            data: [
              { timestamp: new Date('2024-01-01'), value: 10000 },
              { timestamp: new Date('2024-01-02'), value: 15000 },
            ],
            aggregation: 'sum' as const,
          },
          expenses: {
            name: 'Despesas',
            category: 'financial' as const,
            unit: 'BRL',
            data: [],
            aggregation: 'sum' as const,
          },
          projects: {
            name: 'Projetos',
            category: 'projects' as const,
            unit: '',
            data: [],
            aggregation: 'count' as const,
          },
          tasks: {
            name: 'Tarefas',
            category: 'productivity' as const,
            unit: '',
            data: [],
            aggregation: 'count' as const,
          },
        },
        summary: {
          totalRevenue: 100000,
          totalExpenses: 60000,
          profitMargin: 40,
          activeProjects: 5,
          completedTasks: 25,
          pendingApprovals: 3,
        },
      };

      const csv = metricsService.exportToCSV(metrics);

      expect(csv).toContain('Relatório de Métricas');
      expect(csv).toContain('RESUMO');
      expect(csv).toContain('Receita Total');
      expect(csv).toContain('KPIs');
      expect(csv).toContain('Receita Total');
      expect(csv).toContain('RECEITAS');
    });
  });

  // ---------------------------------------------------------------------------
  // KPI Names
  // ---------------------------------------------------------------------------

  describe('getKPIName', () => {
    it('should return correct names for known KPIs', () => {
      expect(metricsService.getKPIName('revenue')).toBe('Receita Total');
      expect(metricsService.getKPIName('profit')).toBe('Lucro Líquido');
      expect(metricsService.getKPIName('active_projects')).toBe('Projetos Ativos');
      expect(metricsService.getKPIName('completed_tasks')).toBe('Tarefas Concluídas');
      expect(metricsService.getKPIName('active_clients')).toBe('Clientes Ativos');
      expect(metricsService.getKPIName('efficiency')).toBe('Eficiência');
    });

    it('should return the id for unknown KPIs', () => {
      expect(metricsService.getKPIName('unknown_kpi')).toBe('unknown_kpi');
    });
  });
});
