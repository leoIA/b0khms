// =============================================================================
// ConstrutorPro - PDF Report Generator Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  type ReportMetadata,
  type ProjectReportData,
  type FinancialReportData,
  type ResourcesReportData,
  type ActivitiesReportData,
  type BudgetReportData,
} from '../pdf/report-generator';

// =============================================================================
// Helper Functions Tests
// =============================================================================

describe('PDF Helper Functions', () => {
  describe('formatCurrency', () => {
    it('should format currency in BRL', () => {
      const result1 = formatCurrency(1000);
      expect(result1).toContain('R$');
      expect(result1).toContain('1.000');

      const result2 = formatCurrency(0);
      expect(result2).toContain('R$');
      expect(result2).toContain('0,00');

      const result3 = formatCurrency(1234.56);
      expect(result3).toContain('R$');
      expect(result3).toContain('1.234');
    });

    it('should handle negative values', () => {
      const result1 = formatCurrency(-500);
      expect(result1).toContain('R$');
      expect(result1).toContain('500');

      const result2 = formatCurrency(-1234.56);
      expect(result2).toContain('R$');
      expect(result2).toContain('1.234');
    });

    it('should handle decimal values', () => {
      const result1 = formatCurrency(0.01);
      expect(result1).toContain('R$');
      expect(result1).toContain('0,01');

      const result2 = formatCurrency(0.99);
      expect(result2).toContain('R$');
      expect(result2).toContain('0,99');
    });
  });

  describe('formatDate', () => {
    it('should format date in DD/MM/YYYY format', () => {
      const date = new Date('2024-03-15T10:30:00');
      expect(formatDate(date)).toBe('15/03/2024');
    });

    it('should return dash for undefined date', () => {
      expect(formatDate(undefined)).toBe('-');
    });

    it('should handle string dates', () => {
      const result = formatDate(new Date('2024-01-01'));
      expect(result).toBe('01/01/2024');
    });

    it('should handle invalid dates gracefully', () => {
      const result = formatDate(new Date('invalid'));
      expect(result).toBe('-');
    });
  });
});

// =============================================================================
// Type Tests
// =============================================================================

describe('PDF Type Definitions', () => {
  it('should accept valid ReportMetadata', () => {
    const metadata: ReportMetadata = {
      title: 'Test Report',
      companyName: 'Test Company',
      generatedBy: 'Test User',
      generatedAt: new Date(),
    };

    expect(metadata.title).toBe('Test Report');
    expect(metadata.companyName).toBe('Test Company');
  });

  it('should accept ReportMetadata with optional fields', () => {
    const metadata: ReportMetadata = {
      title: 'Test Report',
      subtitle: 'Subtitle',
      companyName: 'Test Company',
      generatedBy: 'Test User',
      generatedAt: new Date(),
      period: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      },
    };

    expect(metadata.subtitle).toBe('Subtitle');
    expect(metadata.period?.start).toBeDefined();
  });

  it('should accept valid ProjectReportData', () => {
    const data: ProjectReportData = {
      metadata: {
        title: 'Projects Report',
        companyName: 'Test Company',
        generatedBy: 'System',
        generatedAt: new Date(),
      },
      summary: {
        total: 10,
        active: 5,
        completed: 3,
        delayed: 2,
        totalValue: 100000,
      },
      projects: [
        {
          code: 'PRJ-001',
          name: 'Project 1',
          client: 'Client 1',
          status: 'active',
          estimatedValue: 50000,
          actualValue: 25000,
          physicalProgress: 50,
          financialProgress: 50,
        },
      ],
    };

    expect(data.summary.total).toBe(10);
    expect(data.projects).toHaveLength(1);
  });

  it('should accept valid FinancialReportData', () => {
    const data: FinancialReportData = {
      metadata: {
        title: 'Financial Report',
        companyName: 'Test Company',
        generatedBy: 'System',
        generatedAt: new Date(),
      },
      summary: {
        totalIncome: 100000,
        totalExpenses: 80000,
        balance: 20000,
        pendingIncome: 10000,
        pendingExpenses: 5000,
      },
      transactions: [
        {
          date: new Date(),
          type: 'income',
          category: 'service',
          description: 'Payment received',
          value: 5000,
          status: 'paid',
        },
      ],
      categoryBreakdown: [
        { category: 'Material', value: 40000, percentage: 50 },
        { category: 'Labor', value: 40000, percentage: 50 },
      ],
    };

    expect(data.summary.balance).toBe(20000);
    expect(data.transactions).toHaveLength(1);
    expect(data.categoryBreakdown).toHaveLength(2);
  });

  it('should accept valid ResourcesReportData', () => {
    const data: ResourcesReportData = {
      metadata: {
        title: 'Resources Report',
        companyName: 'Test Company',
        generatedBy: 'System',
        generatedAt: new Date(),
      },
      summary: {
        totalMaterials: 100,
        lowStock: 10,
        totalValue: 50000,
      },
      materials: [
        {
          code: 'MAT-001',
          name: 'Cimento',
          category: 'Construction',
          unit: 'sc',
          unitCost: 25.5,
          stockQuantity: 100,
          minStock: 20,
          supplier: 'Supplier A',
        },
      ],
    };

    expect(data.summary.totalMaterials).toBe(100);
    expect(data.materials).toHaveLength(1);
  });

  it('should accept valid ActivitiesReportData', () => {
    const data: ActivitiesReportData = {
      metadata: {
        title: 'Activities Report',
        companyName: 'Test Company',
        generatedBy: 'System',
        generatedAt: new Date(),
      },
      summary: {
        totalLogs: 50,
        workedDays: 20,
        totalWorkers: 150,
        projectsInvolved: 3,
      },
      dailyLogs: [
        {
          date: new Date(),
          project: 'Project 1',
          weather: 'sunny',
          workersCount: 10,
          summary: 'Work completed successfully',
          observations: 'No issues',
        },
      ],
    };

    expect(data.summary.totalLogs).toBe(50);
    expect(data.dailyLogs).toHaveLength(1);
  });

  it('should accept valid BudgetReportData', () => {
    const data: BudgetReportData = {
      metadata: {
        title: 'Budget Proposal',
        companyName: 'Test Company',
        generatedBy: 'System',
        generatedAt: new Date(),
      },
      budget: {
        id: 'budget-123',
        name: 'Kitchen Renovation',
        client: 'Client A',
        project: 'Residential Project',
        totalValue: 50000,
        discount: 5000,
        finalValue: 45000,
        validUntil: new Date('2024-12-31'),
        items: [
          {
            code: 'ITEM-001',
            description: 'Cabinet Installation',
            unit: 'm²',
            quantity: 10,
            unitPrice: 500,
            totalPrice: 5000,
          },
        ],
      },
    };

    expect(data.budget.finalValue).toBe(45000);
    expect(data.budget.items).toHaveLength(1);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle large currency values', () => {
    const result = formatCurrency(999999999.99);
    expect(result).toContain('R$');
    expect(result).toContain('999.999.999');
  });

  it('should handle very small currency values', () => {
    const result = formatCurrency(0.01);
    expect(result).toContain('R$');
    expect(result).toContain('0,01');
  });

  it('should handle empty project arrays', () => {
    const data: ProjectReportData = {
      metadata: {
        title: 'Empty Report',
        companyName: 'Test',
        generatedBy: 'System',
        generatedAt: new Date(),
      },
      summary: {
        total: 0,
        active: 0,
        completed: 0,
        delayed: 0,
        totalValue: 0,
      },
      projects: [],
    };

    expect(data.projects).toHaveLength(0);
    expect(data.summary.total).toBe(0);
  });

  it('should handle null stock values', () => {
    const data: ResourcesReportData = {
      metadata: {
        title: 'Resources Report',
        companyName: 'Test',
        generatedBy: 'System',
        generatedAt: new Date(),
      },
      summary: {
        totalMaterials: 1,
        lowStock: 0,
        totalValue: 0,
      },
      materials: [
        {
          code: 'MAT-001',
          name: 'Material without stock',
          category: 'Other',
          unit: 'un',
          unitCost: 0,
          stockQuantity: null,
          minStock: null,
        },
      ],
    };

    expect(data.materials[0].stockQuantity).toBeNull();
    expect(data.materials[0].minStock).toBeNull();
  });

  it('should handle transactions with optional fields', () => {
    const data: FinancialReportData = {
      metadata: {
        title: 'Financial Report',
        companyName: 'Test',
        generatedBy: 'System',
        generatedAt: new Date(),
      },
      summary: {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        pendingIncome: 0,
        pendingExpenses: 0,
      },
      transactions: [
        {
          date: new Date(),
          type: 'expense',
          category: 'other',
          description: 'Test',
          value: 100,
          status: 'pending',
        },
      ],
      categoryBreakdown: [],
    };

    expect(data.transactions[0].dueDate).toBeUndefined();
    expect(data.transactions[0].project).toBeUndefined();
  });

  it('should handle zero values correctly', () => {
    const result1 = formatCurrency(0);
    expect(result1).toContain('R$');
    expect(result1).toContain('0,00');

    const result2 = formatCurrency(-0);
    expect(result2).toContain('R$');
    expect(result2).toContain('0,00');
  });

  it('should handle negative balance in financial reports', () => {
    const data: FinancialReportData = {
      metadata: {
        title: 'Financial Report',
        companyName: 'Test',
        generatedBy: 'System',
        generatedAt: new Date(),
      },
      summary: {
        totalIncome: 50000,
        totalExpenses: 75000,
        balance: -25000,
        pendingIncome: 0,
        pendingExpenses: 10000,
      },
      transactions: [],
      categoryBreakdown: [],
    };

    expect(data.summary.balance).toBeLessThan(0);
    expect(formatCurrency(data.summary.balance)).toContain('R$');
    expect(formatCurrency(data.summary.balance)).toContain('25.000');
  });
});
