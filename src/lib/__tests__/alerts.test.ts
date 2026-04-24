// =============================================================================
// ConstrutorPro - Alert Utilities Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAlert,
  createAlerts,
  hasRecentAlert,
  createLowStockAlert,
  createProjectDelayedAlert,
  createTaskDueSoonAlert,
  createPaymentAlert,
  createBudgetOverrunAlert,
  createQuotationReceivedAlert,
  createProjectCompletedAlert,
  createNewClientAlert,
  createMeasurementApprovedAlert,
} from '../alerts';
import * as dbModule from '@/lib/db';

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    alerts: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
    },
    materials: {
      findMany: vi.fn(),
    },
    projects: {
      findMany: vi.fn(),
    },
    transactions: {
      findMany: vi.fn(),
    },
  },
}));

describe('Alert Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAlert', () => {
    it('should create a new alert', async () => {
      const mockAlert = {
        id: 'alert-1',
        companyId: 'company-1',
        type: 'info',
        title: 'Test Alert',
        message: 'Test message',
        isRead: false,
      };

      vi.mocked(dbModule.db.alerts.create).mockResolvedValue(mockAlert);

      const result = await createAlert({
        companyId: 'company-1',
        type: 'info',
        title: 'Test Alert',
        message: 'Test message',
      });

      expect(result).toEqual(mockAlert);
      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-1',
          type: 'info',
          title: 'Test Alert',
          message: 'Test message',
          isRead: false,
        }),
      });
    });

    it('should create alert with entity reference', async () => {
      const mockAlert = {
        id: 'alert-1',
        companyId: 'company-1',
        type: 'warning',
        title: 'Test',
        message: 'Test',
        entityType: 'project',
        entityId: 'project-1',
        isRead: false,
      };

      vi.mocked(dbModule.db.alerts.create).mockResolvedValue(mockAlert);

      await createAlert({
        companyId: 'company-1',
        type: 'warning',
        title: 'Test',
        message: 'Test',
        entityType: 'project',
        entityId: 'project-1',
      });

      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'project',
          entityId: 'project-1',
        }),
      });
    });
  });

  describe('createAlerts', () => {
    it('should create multiple alerts at once', async () => {
      vi.mocked(dbModule.db.alerts.createMany).mockResolvedValue({ count: 2 });

      const result = await createAlerts([
        {
          companyId: 'company-1',
          type: 'info',
          title: 'Alert 1',
          message: 'Message 1',
        },
        {
          companyId: 'company-1',
          type: 'warning',
          title: 'Alert 2',
          message: 'Message 2',
        },
      ]);

      expect(dbModule.db.alerts.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ title: 'Alert 1' }),
          expect.objectContaining({ title: 'Alert 2' }),
        ]),
      });
    });

    it('should return empty array when no inputs provided', async () => {
      const result = await createAlerts([]);
      expect(result).toEqual([]);
      expect(dbModule.db.alerts.createMany).not.toHaveBeenCalled();
    });
  });

  describe('hasRecentAlert', () => {
    it('should return true when recent alert exists', async () => {
      vi.mocked(dbModule.db.alerts.findFirst).mockResolvedValue({
        id: 'existing-alert',
      } as ReturnType<typeof dbModule.db.alerts.findFirst>);

      const result = await hasRecentAlert('company-1', 'Test Alert', 'entity-1');

      expect(result).toBe(true);
      expect(dbModule.db.alerts.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            title: 'Test Alert',
            entityId: 'entity-1',
          }),
        })
      );
    });

    it('should return false when no recent alert exists', async () => {
      vi.mocked(dbModule.db.alerts.findFirst).mockResolvedValue(null);

      const result = await hasRecentAlert('company-1', 'Test Alert');

      expect(result).toBe(false);
    });
  });

  describe('createLowStockAlert', () => {
    it('should create low stock alert', async () => {
      vi.mocked(dbModule.db.alerts.findFirst).mockResolvedValue(null);
      vi.mocked(dbModule.db.alerts.create).mockResolvedValue({
        id: 'alert-1',
        type: 'warning',
        title: 'Estoque Baixo',
        message: 'O material "Cimento" está com estoque baixo. Atual: 10, Mínimo: 50',
      } as ReturnType<typeof dbModule.db.alerts.create>);

      const result = await createLowStockAlert(
        'company-1',
        'material-1',
        'Cimento',
        10,
        50
      );

      expect(result).not.toBeNull();
      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'warning',
          title: 'Estoque Baixo',
          entityType: 'material',
          entityId: 'material-1',
        }),
      });
    });

    it('should not create duplicate alert within 24 hours', async () => {
      vi.mocked(dbModule.db.alerts.findFirst).mockResolvedValue({
        id: 'existing-alert',
      } as ReturnType<typeof dbModule.db.alerts.findFirst>);

      const result = await createLowStockAlert(
        'company-1',
        'material-1',
        'Cimento',
        10,
        50
      );

      expect(result).toBeNull();
      expect(dbModule.db.alerts.create).not.toHaveBeenCalled();
    });
  });

  describe('createProjectDelayedAlert', () => {
    it('should create project delayed alert', async () => {
      vi.mocked(dbModule.db.alerts.findFirst).mockResolvedValue(null);
      vi.mocked(dbModule.db.alerts.create).mockResolvedValue({
        id: 'alert-1',
        type: 'error',
        title: 'Projeto Atrasado',
      } as ReturnType<typeof dbModule.db.alerts.create>);

      const result = await createProjectDelayedAlert(
        'company-1',
        'project-1',
        'Construção ABC',
        5
      );

      expect(result).not.toBeNull();
      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'error',
          title: 'Projeto Atrasado',
          message: expect.stringContaining('5 dias'),
          entityType: 'project',
        }),
      });
    });
  });

  describe('createTaskDueSoonAlert', () => {
    it('should create task due soon alert with error type for tasks due in 1 day', async () => {
      vi.mocked(dbModule.db.alerts.findFirst).mockResolvedValue(null);
      vi.mocked(dbModule.db.alerts.create).mockResolvedValue({
        id: 'alert-1',
      } as ReturnType<typeof dbModule.db.alerts.create>);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await createTaskDueSoonAlert(
        'company-1',
        'task-1',
        'Fundação',
        'Construção ABC',
        tomorrow
      );

      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'error',
        }),
      });
    });

    it('should create task due soon alert with warning type for tasks due in more than 1 day', async () => {
      vi.mocked(dbModule.db.alerts.findFirst).mockResolvedValue(null);
      vi.mocked(dbModule.db.alerts.create).mockResolvedValue({
        id: 'alert-1',
      } as ReturnType<typeof dbModule.db.alerts.create>);

      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);

      await createTaskDueSoonAlert(
        'company-1',
        'task-1',
        'Fundação',
        'Construção ABC',
        inThreeDays
      );

      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'warning',
        }),
      });
    });
  });

  describe('createPaymentAlert', () => {
    it('should create overdue payment alert', async () => {
      vi.mocked(dbModule.db.alerts.findFirst).mockResolvedValue(null);
      vi.mocked(dbModule.db.alerts.create).mockResolvedValue({
        id: 'alert-1',
      } as ReturnType<typeof dbModule.db.alerts.create>);

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      await createPaymentAlert(
        'company-1',
        'transaction-1',
        'Fornecedor XYZ',
        5000,
        pastDate,
        true
      );

      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'error',
          title: 'Pagamento Vencido',
          message: expect.stringContaining('vencido'),
        }),
      });
    });

    it('should create upcoming payment alert', async () => {
      vi.mocked(dbModule.db.alerts.findFirst).mockResolvedValue(null);
      vi.mocked(dbModule.db.alerts.create).mockResolvedValue({
        id: 'alert-1',
      } as ReturnType<typeof dbModule.db.alerts.create>);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      await createPaymentAlert(
        'company-1',
        'transaction-1',
        'Fornecedor XYZ',
        5000,
        futureDate,
        false
      );

      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'warning',
          title: 'Pagamento Próximo do Vencimento',
        }),
      });
    });
  });

  describe('createBudgetOverrunAlert', () => {
    it('should create budget overrun alert', async () => {
      vi.mocked(dbModule.db.alerts.findFirst).mockResolvedValue(null);
      vi.mocked(dbModule.db.alerts.create).mockResolvedValue({
        id: 'alert-1',
      } as ReturnType<typeof dbModule.db.alerts.create>);

      await createBudgetOverrunAlert(
        'company-1',
        'project-1',
        'Construção ABC',
        100000,
        120000,
        20
      );

      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'error',
          title: 'Estouro de Orçamento',
          message: expect.stringContaining('20.0%'),
        }),
      });
    });
  });

  describe('createQuotationReceivedAlert', () => {
    it('should create quotation received alert', async () => {
      vi.mocked(dbModule.db.alerts.create).mockResolvedValue({
        id: 'alert-1',
      } as ReturnType<typeof dbModule.db.alerts.create>);

      await createQuotationReceivedAlert(
        'company-1',
        'quotation-1',
        'Fornecedor ABC',
        'Cotação de Materiais'
      );

      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'success',
          title: 'Nova Cotação Recebida',
        }),
      });
    });
  });

  describe('createProjectCompletedAlert', () => {
    it('should create project completed alert', async () => {
      vi.mocked(dbModule.db.alerts.create).mockResolvedValue({
        id: 'alert-1',
      } as ReturnType<typeof dbModule.db.alerts.create>);

      await createProjectCompletedAlert(
        'company-1',
        'project-1',
        'Construção ABC'
      );

      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'success',
          title: 'Projeto Concluído',
        }),
      });
    });
  });

  describe('createNewClientAlert', () => {
    it('should create new client alert', async () => {
      vi.mocked(dbModule.db.alerts.create).mockResolvedValue({
        id: 'alert-1',
      } as ReturnType<typeof dbModule.db.alerts.create>);

      await createNewClientAlert('company-1', 'client-1', 'João Silva');

      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'info',
          title: 'Novo Cliente',
        }),
      });
    });
  });

  describe('createMeasurementApprovedAlert', () => {
    it('should create measurement approved alert', async () => {
      vi.mocked(dbModule.db.alerts.create).mockResolvedValue({
        id: 'alert-1',
      } as ReturnType<typeof dbModule.db.alerts.create>);

      await createMeasurementApprovedAlert(
        'company-1',
        'measurement-1',
        'Construção ABC',
        5
      );

      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'success',
          title: 'Medição Aprovada',
          message: expect.stringContaining('#5'),
        }),
      });
    });
  });
});
