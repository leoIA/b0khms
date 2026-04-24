// =============================================================================
// ConstrutorPro - Approval Workflow Service Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approvalWorkflowService } from '../approval-workflow';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    approval_workflows: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    approval_steps: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    approval_requests: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      fields: {
        currentStep: 'currentStep',
      },
    },
    approval_decisions: {
      create: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    approval_delegations: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    users: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    budgets: {
      update: vi.fn(),
    },
    purchase_orders: {
      update: vi.fn(),
    },
    medicoes: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue('audit-log-id'),
  },
}));

vi.mock('@/lib/notification-service', () => ({
  notificationService: {
    send: vi.fn().mockResolvedValue(undefined),
  },
  createNotification: vi.fn().mockResolvedValue({ id: 'notification-1' }),
}));

describe('ApprovalWorkflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkflow', () => {
    it('should create a workflow with steps', async () => {
      const { db } = await import('@/lib/db');
      const mockWorkflow = {
        id: 'workflow-1',
        companyId: 'company-1',
        name: 'Test Workflow',
        entityType: 'budget',
        approval_steps: [],
      };

      vi.mocked(db.approval_workflows.create).mockResolvedValue(mockWorkflow as any);

      const input = {
        companyId: 'company-1',
        name: 'Test Workflow',
        entityType: 'budget' as const,
        steps: [
          {
            name: 'Step 1',
            order: 1,
            approverType: 'user' as const,
            approverId: 'user-1',
          },
        ],
      };

      const result = await approvalWorkflowService.createWorkflow(input);

      expect(db.approval_workflows.create).toHaveBeenCalled();
      expect(result).toEqual(mockWorkflow);
    });
  });

  describe('listWorkflows', () => {
    it('should list workflows with pagination', async () => {
      const { db } = await import('@/lib/db');
      const mockWorkflows = [
        { id: 'workflow-1', name: 'Workflow 1' },
        { id: 'workflow-2', name: 'Workflow 2' },
      ];

      vi.mocked(db.approval_workflows.findMany).mockResolvedValue(mockWorkflows as any);
      vi.mocked(db.approval_workflows.count).mockResolvedValue(2);

      const result = await approvalWorkflowService.listWorkflows('company-1');

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.pages).toBe(1);
    });

    it('should filter by entityType', async () => {
      const { db } = await import('@/lib/db');
      
      vi.mocked(db.approval_workflows.findMany).mockResolvedValue([]);
      vi.mocked(db.approval_workflows.count).mockResolvedValue(0);

      await approvalWorkflowService.listWorkflows('company-1', {
        entityType: 'budget',
      });

      expect(db.approval_workflows.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'budget',
          }),
        })
      );
    });
  });

  describe('getWorkflow', () => {
    it('should return workflow with steps', async () => {
      const { db } = await import('@/lib/db');
      const mockWorkflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        approval_steps: [{ id: 'step-1', order: 1 }],
      };

      vi.mocked(db.approval_workflows.findFirst).mockResolvedValue(mockWorkflow as any);

      const result = await approvalWorkflowService.getWorkflow('workflow-1', 'company-1');

      expect(result).toEqual(mockWorkflow);
    });

    it('should return null if not found', async () => {
      const { db } = await import('@/lib/db');
      
      vi.mocked(db.approval_workflows.findFirst).mockResolvedValue(null);

      const result = await approvalWorkflowService.getWorkflow('nonexistent', 'company-1');

      expect(result).toBeNull();
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow without active requests', async () => {
      const { db } = await import('@/lib/db');
      
      vi.mocked(db.approval_requests.count).mockResolvedValue(0);
      vi.mocked(db.approval_workflows.delete).mockResolvedValue({} as any);

      await approvalWorkflowService.deleteWorkflow('workflow-1', 'company-1');

      expect(db.approval_workflows.delete).toHaveBeenCalledWith({
        where: { id: 'workflow-1', companyId: 'company-1' },
      });
    });

    it('should throw error if workflow has active requests', async () => {
      const { db } = await import('@/lib/db');
      
      vi.mocked(db.approval_requests.count).mockResolvedValue(5);

      await expect(
        approvalWorkflowService.deleteWorkflow('workflow-1', 'company-1')
      ).rejects.toThrow('Não é possível excluir workflow com solicitações ativas');
    });
  });
});

describe('Approval Request Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRequest', () => {
    it('should create request when workflow is valid', async () => {
      const { db } = await import('@/lib/db');
      const mockWorkflow = {
        id: 'workflow-1',
        isActive: true,
        notifyApprovers: true,
        notifyRequester: true,
        approval_steps: [{ id: 'step-1', order: 1, approverType: 'user', approverId: 'approver-1' }],
      };

      const mockRequest = {
        id: 'request-1',
        title: 'Test Request',
        entityType: 'budget',
        entityId: 'budget-1',
        workflowId: 'workflow-1',
        approval_workflows: mockWorkflow,
      };

      vi.mocked(db.approval_workflows.findFirst).mockResolvedValue(mockWorkflow as any);
      vi.mocked(db.approval_requests.findFirst).mockResolvedValue(null);
      vi.mocked(db.approval_requests.create).mockResolvedValue(mockRequest as any);

      const input = {
        companyId: 'company-1',
        workflowId: 'workflow-1',
        entityType: 'budget' as const,
        entityId: 'budget-1',
        requestedBy: 'user-1',
        title: 'Test Request',
      };

      const result = await approvalWorkflowService.createRequest(input);

      expect(result).toEqual(mockRequest);
    });

    it('should throw error if workflow is inactive', async () => {
      const { db } = await import('@/lib/db');
      const mockWorkflow = {
        id: 'workflow-1',
        isActive: false,
        approval_steps: [],
      };

      vi.mocked(db.approval_workflows.findFirst).mockResolvedValue(mockWorkflow as any);

      const input = {
        companyId: 'company-1',
        workflowId: 'workflow-1',
        entityType: 'budget' as const,
        entityId: 'budget-1',
        requestedBy: 'user-1',
        title: 'Test Request',
      };

      await expect(
        approvalWorkflowService.createRequest(input)
      ).rejects.toThrow('Workflow está inativo');
    });

    it('should throw error if entity already has pending request', async () => {
      const { db } = await import('@/lib/db');
      const mockWorkflow = {
        id: 'workflow-1',
        isActive: true,
        approval_steps: [],
      };

      vi.mocked(db.approval_workflows.findFirst).mockResolvedValue(mockWorkflow as any);
      vi.mocked(db.approval_requests.findFirst).mockResolvedValue({ id: 'existing-request' } as any);

      const input = {
        companyId: 'company-1',
        workflowId: 'workflow-1',
        entityType: 'budget' as const,
        entityId: 'budget-1',
        requestedBy: 'user-1',
        title: 'Test Request',
      };

      await expect(
        approvalWorkflowService.createRequest(input)
      ).rejects.toThrow('Já existe uma solicitação pendente');
    });
  });

  describe('cancelRequest', () => {
    it('should cancel a pending request', async () => {
      const { db } = await import('@/lib/db');
      const mockRequest = {
        id: 'request-1',
        status: 'pending',
        requestedBy: 'user-1',
      };

      vi.mocked(db.approval_requests.findFirst).mockResolvedValue(mockRequest as any);
      vi.mocked(db.approval_requests.update).mockResolvedValue({
        ...mockRequest,
        status: 'cancelled',
        cancelledAt: new Date(),
      } as any);

      const result = await approvalWorkflowService.cancelRequest(
        'request-1',
        'company-1',
        'user-1',
        'No longer needed'
      );

      expect(result.status).toBe('cancelled');
    });

    it('should throw error if request cannot be cancelled', async () => {
      const { db } = await import('@/lib/db');
      const mockRequest = {
        id: 'request-1',
        status: 'approved',
      };

      vi.mocked(db.approval_requests.findFirst).mockResolvedValue(mockRequest as any);

      await expect(
        approvalWorkflowService.cancelRequest('request-1', 'company-1', 'user-1')
      ).rejects.toThrow('Solicitação não pode ser cancelada');
    });
  });
});

describe('Delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDelegation', () => {
    it('should create delegation between users', async () => {
      const { db } = await import('@/lib/db');
      
      vi.mocked(db.users.findFirst)
        .mockResolvedValueOnce({ id: 'user-1', companyId: 'company-1' } as any)
        .mockResolvedValueOnce({ id: 'user-2', companyId: 'company-1' } as any);
      
      vi.mocked(db.approval_delegations.findFirst).mockResolvedValue(null);
      
      vi.mocked(db.approval_delegations.create).mockResolvedValue({
        id: 'delegation-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
      } as any);

      const input = {
        companyId: 'company-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        startDate: new Date(),
      };

      const result = await approvalWorkflowService.createDelegation(input);

      expect(result).toBeTruthy();
    });

    it('should throw error if delegating to self', async () => {
      const { db } = await import('@/lib/db');
      
      vi.mocked(db.users.findFirst)
        .mockResolvedValueOnce({ id: 'user-1', companyId: 'company-1' } as any)
        .mockResolvedValueOnce({ id: 'user-1', companyId: 'company-1' } as any);

      const input = {
        companyId: 'company-1',
        fromUserId: 'user-1',
        toUserId: 'user-1',
        startDate: new Date(),
      };

      await expect(
        approvalWorkflowService.createDelegation(input)
      ).rejects.toThrow('Não é possível delegar para si mesmo');
    });
  });

  describe('revokeDelegation', () => {
    it('should revoke delegation', async () => {
      const { db } = await import('@/lib/db');
      
      vi.mocked(db.approval_delegations.update).mockResolvedValue({
        id: 'delegation-1',
        isActive: false,
      } as any);

      await approvalWorkflowService.revokeDelegation('delegation-1', 'company-1');

      expect(db.approval_delegations.update).toHaveBeenCalledWith({
        where: { id: 'delegation-1', companyId: 'company-1' },
        data: { isActive: false },
      });
    });
  });
});

describe('Statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return approval statistics', async () => {
      const { db } = await import('@/lib/db');
      
      vi.mocked(db.approval_requests.count)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20) // pending
        .mockResolvedValueOnce(65) // approved
        .mockResolvedValueOnce(15); // rejected
      
      vi.mocked(db.approval_requests.findMany).mockResolvedValue([
        { createdAt: new Date('2024-01-01'), completedAt: new Date('2024-01-03') },
        { createdAt: new Date('2024-01-05'), completedAt: new Date('2024-01-06') },
      ] as any);

      const stats = await approvalWorkflowService.getStats('company-1');

      expect(stats.totalRequests).toBe(100);
      expect(stats.pendingRequests).toBe(20);
      expect(stats.approvedRequests).toBe(65);
      expect(stats.rejectedRequests).toBe(15);
      expect(stats.approvalRate).toBe(65);
    });
  });
});
