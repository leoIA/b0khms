// =============================================================================
// ConstrutorPro - Approval Workflow Service
// Serviço completo para gerenciamento de fluxos de aprovação
// =============================================================================

import { db } from '@/lib/db';
import { auditLogger } from '@/lib/audit-logger';
import { createNotification } from '@/lib/notification-service';

// =============================================================================
// Tipos e Interfaces
// =============================================================================

export type WorkflowEntityType =
  | 'budget'
  | 'purchase_order'
  | 'transaction'
  | 'medicao'
  | 'project'
  | 'quotation';

export type WorkflowTriggerMode = 'manual' | 'auto' | 'threshold';

export type WorkflowApprovalOrder = 'sequential' | 'parallel' | 'any';

export type ApproverType = 'user' | 'role' | 'manager' | 'owner';

export type RequestStatus =
  | 'pending'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export type DecisionType = 'approved' | 'rejected' | 'returned' | 'delegated';

export type UrgencyLevel = 'low' | 'normal' | 'high' | 'urgent';

export type DelegationScope = 'all' | 'workflow' | 'entityType';

export interface CreateWorkflowInput {
  companyId: string;
  createdBy?: string;
  name: string;
  description?: string;
  code?: string;
  entityType: WorkflowEntityType;
  triggerMode?: WorkflowTriggerMode;
  thresholdMin?: number;
  thresholdMax?: number;
  isActive?: boolean;
  allowDelegation?: boolean;
  allowRejection?: boolean;
  requireComment?: boolean;
  notifyRequester?: boolean;
  notifyApprovers?: boolean;
  timeoutDays?: number;
  escalationTo?: string;
  autoApproveOnTimeout?: boolean;
  approvalOrder?: WorkflowApprovalOrder;
  steps: CreateStepInput[];
}

export interface CreateStepInput {
  name: string;
  description?: string;
  order: number;
  approverType: ApproverType;
  approverId?: string;
  approverRole?: string;
  isRequired?: boolean;
  minApprovals?: number;
  canEditData?: boolean;
  canAddAttachments?: boolean;
  conditions?: Record<string, unknown>;
}

export interface CreateRequestInput {
  companyId: string;
  workflowId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  entityData?: Record<string, unknown>;
  requestedBy: string;
  title: string;
  description?: string;
  value?: number;
  urgency?: UrgencyLevel;
  dueDate?: Date;
  notes?: string;
}

export interface CreateDecisionInput {
  requestId: string;
  stepId: string;
  approverId: string;
  decision: DecisionType;
  comment?: string;
  data?: Record<string, unknown>;
  attachments?: string[];
}

export interface CreateDelegationInput {
  companyId: string;
  fromUserId: string;
  toUserId: string;
  startDate: Date;
  endDate?: Date;
  scope?: DelegationScope;
  scopeIds?: string[];
  reason?: string;
}

// =============================================================================
// Approval Workflow Service
// =============================================================================

class ApprovalWorkflowService {
  // ===========================================================================
  // Workflow Management
  // ===========================================================================

  /**
   * Cria um novo fluxo de aprovação
   */
  async createWorkflow(input: CreateWorkflowInput) {
    const { steps, ...workflowData } = input;

    const workflow = await db.approval_workflows.create({
      data: {
        ...workflowData,
        thresholdMin: workflowData.thresholdMin ? workflowData.thresholdMin : null,
        thresholdMax: workflowData.thresholdMax ? workflowData.thresholdMax : null,
        approval_steps: {
          create: steps.map(step => ({
            name: step.name,
            description: step.description,
            order: step.order,
            approverType: step.approverType,
            approverId: step.approverId,
            approverRole: step.approverRole,
            isRequired: step.isRequired ?? true,
            minApprovals: step.minApprovals ?? 1,
            canEditData: step.canEditData ?? false,
            canAddAttachments: step.canAddAttachments ?? true,
            conditions: step.conditions ? JSON.stringify(step.conditions) : null,
          })),
        },
      },
      include: {
        approval_steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Audit log
    await auditLogger.log({
      action: 'webhook_created',
      category: 'system',
      userId: input.companyId, // Will be replaced with actual userId
      companyId: input.companyId,
      resourceType: 'approval_workflow',
      resourceId: workflow.id,
      resourceName: workflow.name,
      newValue: { name: workflow.name, entityType: workflow.entityType },
    });

    return workflow;
  }

  /**
   * Lista workflows de uma empresa
   */
  async listWorkflows(
    companyId: string,
    options?: {
      entityType?: WorkflowEntityType;
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { companyId };

    if (options?.entityType) where.entityType = options.entityType;
    if (options?.isActive !== undefined) where.isActive = options.isActive;
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [workflows, total] = await Promise.all([
      db.approval_workflows.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          approval_steps: {
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { approval_requests: true },
          },
        },
      }),
      db.approval_workflows.count({ where }),
    ]);

    return {
      data: workflows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Obtém um workflow por ID
   */
  async getWorkflow(workflowId: string, companyId: string) {
    return db.approval_workflows.findFirst({
      where: { id: workflowId, companyId },
      include: {
        approval_steps: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Atualiza um workflow
   */
  async updateWorkflow(
    workflowId: string,
    companyId: string,
    data: Partial<Omit<CreateWorkflowInput, 'steps'>>
  ) {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.entityType !== undefined) updateData.entityType = data.entityType;
    if (data.triggerMode !== undefined) updateData.triggerMode = data.triggerMode;
    if (data.thresholdMin !== undefined) updateData.thresholdMin = data.thresholdMin;
    if (data.thresholdMax !== undefined) updateData.thresholdMax = data.thresholdMax;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.allowDelegation !== undefined) updateData.allowDelegation = data.allowDelegation;
    if (data.allowRejection !== undefined) updateData.allowRejection = data.allowRejection;
    if (data.requireComment !== undefined) updateData.requireComment = data.requireComment;
    if (data.notifyRequester !== undefined) updateData.notifyRequester = data.notifyRequester;
    if (data.notifyApprovers !== undefined) updateData.notifyApprovers = data.notifyApprovers;
    if (data.timeoutDays !== undefined) updateData.timeoutDays = data.timeoutDays;
    if (data.escalationTo !== undefined) updateData.escalationTo = data.escalationTo;
    if (data.autoApproveOnTimeout !== undefined)
      updateData.autoApproveOnTimeout = data.autoApproveOnTimeout;
    if (data.approvalOrder !== undefined) updateData.approvalOrder = data.approvalOrder;

    return db.approval_workflows.update({
      where: { id: workflowId, companyId },
      data: updateData,
    });
  }

  /**
   * Exclui um workflow
   */
  async deleteWorkflow(workflowId: string, companyId: string) {
    // Check for active requests
    const activeRequests = await db.approval_requests.count({
      where: {
        workflowId,
        status: { in: ['pending', 'in_progress'] },
      },
    });

    if (activeRequests > 0) {
      throw new Error('Não é possível excluir workflow com solicitações ativas');
    }

    return db.approval_workflows.delete({
      where: { id: workflowId, companyId },
    });
  }

  // ===========================================================================
  // Step Management
  // ===========================================================================

  /**
   * Adiciona uma etapa ao workflow
   */
  async addStep(workflowId: string, input: CreateStepInput) {
    return db.approval_steps.create({
      data: {
        workflowId,
        name: input.name,
        description: input.description,
        order: input.order,
        approverType: input.approverType,
        approverId: input.approverId,
        approverRole: input.approverRole,
        isRequired: input.isRequired ?? true,
        minApprovals: input.minApprovals ?? 1,
        canEditData: input.canEditData ?? false,
        canAddAttachments: input.canAddAttachments ?? true,
        conditions: input.conditions ? JSON.stringify(input.conditions) : null,
      },
    });
  }

  /**
   * Atualiza uma etapa
   */
  async updateStep(stepId: string, workflowId: string, data: Partial<CreateStepInput>) {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.approverType !== undefined) updateData.approverType = data.approverType;
    if (data.approverId !== undefined) updateData.approverId = data.approverId;
    if (data.approverRole !== undefined) updateData.approverRole = data.approverRole;
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
    if (data.minApprovals !== undefined) updateData.minApprovals = data.minApprovals;
    if (data.canEditData !== undefined) updateData.canEditData = data.canEditData;
    if (data.canAddAttachments !== undefined) updateData.canAddAttachments = data.canAddAttachments;
    if (data.conditions !== undefined) updateData.conditions = JSON.stringify(data.conditions);

    return db.approval_steps.update({
      where: { id: stepId, workflowId },
      data: updateData,
    });
  }

  /**
   * Remove uma etapa
   */
  async deleteStep(stepId: string, workflowId: string) {
    return db.approval_steps.delete({
      where: { id: stepId, workflowId },
    });
  }

  // ===========================================================================
  // Request Management
  // ===========================================================================

  /**
   * Cria uma nova solicitação de aprovação
   */
  async createRequest(input: CreateRequestInput) {
    // Get workflow
    const workflow = await db.approval_workflows.findFirst({
      where: { id: input.workflowId, companyId: input.companyId },
      include: {
        approval_steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workflow) {
      throw new Error('Workflow não encontrado');
    }

    if (!workflow.isActive) {
      throw new Error('Workflow está inativo');
    }

    // Check if entity already has a pending request
    const existingRequest = await db.approval_requests.findFirst({
      where: {
        entityType: input.entityType,
        entityId: input.entityId,
        status: { in: ['pending', 'in_progress'] },
      },
    });

    if (existingRequest) {
      throw new Error('Já existe uma solicitação pendente para esta entidade');
    }

    // Create request
    const request = await db.approval_requests.create({
      data: {
        companyId: input.companyId,
        workflowId: input.workflowId,
        entityType: input.entityType,
        entityId: input.entityId,
        entityData: input.entityData ? JSON.stringify(input.entityData) : null,
        requestedBy: input.requestedBy,
        title: input.title,
        description: input.description,
        value: input.value,
        urgency: input.urgency ?? 'normal',
        dueDate: input.dueDate,
        notes: input.notes,
        status: 'pending',
        currentStep: 1,
      },
      include: {
        approval_workflows: {
          include: {
            approval_steps: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    // Notify approvers
    if (workflow.notifyApprovers) {
      await this.notifyApproversForStep(request, workflow.approval_steps[0]);
    }

    // Notify requester
    if (workflow.notifyRequester) {
      await this.notifyRequester(request, 'created');
    }

    // Audit log
    await auditLogger.log({
      action: 'project_created',
      category: 'data_modification',
      userId: input.requestedBy,
      companyId: input.companyId,
      resourceType: 'approval_request',
      resourceId: request.id,
      resourceName: request.title,
      newValue: { title: request.title, entityType: request.entityType },
    });

    return request;
  }

  /**
   * Lista solicitações de aprovação
   */
  async listRequests(
    companyId: string,
    options?: {
      workflowId?: string;
      entityType?: WorkflowEntityType;
      status?: RequestStatus | RequestStatus[];
      requestedBy?: string;
      pendingApprovalFor?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { companyId };

    if (options?.workflowId) where.workflowId = options.workflowId;
    if (options?.entityType) where.entityType = options.entityType;
    if (options?.status) {
      where.status = Array.isArray(options.status)
        ? { in: options.status }
        : options.status;
    }
    if (options?.requestedBy) where.requestedBy = options.requestedBy;
    if (options?.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    // Handle pendingApprovalFor - requests where user is an approver
    if (options?.pendingApprovalFor) {
      // This requires a more complex query
      const userId = options.pendingApprovalFor;
      const user = await db.users.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // Get requests where user is in current step
      where.AND = [
        { status: { in: ['pending', 'in_progress'] } },
        {
          OR: [
            // User is direct approver in current step
            {
              approval_workflows: {
                approval_steps: {
                  some: {
                    order: { equals: db.approval_requests.fields.currentStep },
                    approverType: 'user',
                    approverId: userId,
                  },
                },
              },
            },
            // User's role is approver in current step
            {
              approval_workflows: {
                approval_steps: {
                  some: {
                    order: { equals: db.approval_requests.fields.currentStep },
                    approverType: 'role',
                    approverRole: user?.role,
                  },
                },
              },
            },
          ],
        },
      ];
    }

    const [requests, total] = await Promise.all([
      db.approval_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          approval_workflows: {
            select: { id: true, name: true, entityType: true },
          },
          users_approval_requests_requestedByTousers: {
            select: { id: true, name: true, email: true },
          },
          approval_decisions: {
            select: {
              id: true,
              decision: true,
              comment: true,
              decidedAt: true,
              users: { select: { id: true, name: true, email: true } },
            },
            orderBy: { decidedAt: 'desc' },
          },
        },
      }),
      db.approval_requests.count({ where }),
    ]);

    return {
      data: requests.map(r => ({
        ...r,
        entityData: r.entityData ? JSON.parse(r.entityData) : null,
        requestedByUser: r.users_approval_requests_requestedByTousers,
        users_approval_requests_requestedByTousers: undefined,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Obtém uma solicitação por ID
   */
  async getRequest(requestId: string, companyId: string) {
    const request = await db.approval_requests.findFirst({
      where: { id: requestId, companyId },
      include: {
        approval_workflows: {
          include: {
            approval_steps: { orderBy: { order: 'asc' } },
          },
        },
        users_approval_requests_requestedByTousers: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        users_approval_requests_cancelledByTousers: {
          select: { id: true, name: true, email: true },
        },
        approval_decisions: {
          include: {
            users: { select: { id: true, name: true, email: true, avatar: true } },
            approval_steps: { select: { id: true, name: true, order: true } },
          },
          orderBy: { decidedAt: 'desc' },
        },
      },
    });

    if (!request) return null;

    return {
      ...request,
      entityData: request.entityData ? JSON.parse(request.entityData) : null,
      requestedByUser: request.users_approval_requests_requestedByTousers,
      cancelledByUser: request.users_approval_requests_cancelledByTousers,
      users_approval_requests_requestedByTousers: undefined,
      users_approval_requests_cancelledByTousers: undefined,
    };
  }

  /**
   * Cancela uma solicitação
   */
  async cancelRequest(
    requestId: string,
    companyId: string,
    cancelledBy: string,
    reason?: string
  ) {
    const request = await db.approval_requests.findFirst({
      where: { id: requestId, companyId },
    });

    if (!request) {
      throw new Error('Solicitação não encontrada');
    }

    if (!['pending', 'in_progress'].includes(request.status)) {
      throw new Error('Solicitação não pode ser cancelada');
    }

    const updated = await db.approval_requests.update({
      where: { id: requestId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        cancelReason: reason,
      },
    });

    // Notify stakeholders
    if (request.requestedBy !== cancelledBy) {
      await this.notifyRequester(updated, 'cancelled');
    }

    return updated;
  }

  // ===========================================================================
  // Decision Management
  // ===========================================================================

  /**
   * Processa uma decisão de aprovação
   */
  async createDecision(input: CreateDecisionInput) {
    const request = await db.approval_requests.findUnique({
      where: { id: input.requestId },
      include: {
        approval_workflows: {
          include: {
            approval_steps: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!request) {
      throw new Error('Solicitação não encontrada');
    }

    if (!['pending', 'in_progress'].includes(request.status)) {
      throw new Error('Solicitação não está aguardando aprovação');
    }

    // Verify user can approve this step
    const canApprove = await this.canUserApproveStep(
      input.approverId,
      request,
      input.stepId
    );

    if (!canApprove) {
      throw new Error('Usuário não autorizado a aprovar esta etapa');
    }

    // Check if already decided
    const existingDecision = await db.approval_decisions.findUnique({
      where: {
        requestId_stepId_approverId: {
          requestId: input.requestId,
          stepId: input.stepId,
          approverId: input.approverId,
        },
      },
    });

    if (existingDecision) {
      throw new Error('Usuário já tomou decisão nesta etapa');
    }

    // Get user role at decision time
    const user = await db.users.findUnique({
      where: { id: input.approverId },
      select: { role: true },
    });

    // Create decision
    const decision = await db.approval_decisions.create({
      data: {
        requestId: input.requestId,
        stepId: input.stepId,
        approverId: input.approverId,
        approverRole: user?.role,
        decision: input.decision,
        comment: input.comment,
        data: input.data ? JSON.stringify(input.data) : null,
        attachments: input.attachments ? JSON.stringify(input.attachments) : null,
        decidedAt: new Date(),
      },
    });

    // Update request status based on decision
    await this.processDecisionResult({
      id: request.id,
      workflowId: request.workflowId,
      currentStep: request.currentStep,
      companyId: request.companyId,
      requestedBy: request.requestedBy,
      title: request.title,
      entityType: request.entityType,
      entityId: request.entityId,
    }, input.decision, input.stepId);

    return decision;
  }

  /**
   * Verifica se um usuário pode aprovar uma etapa
   */
  private async canUserApproveStep(
    userId: string,
    request: { workflowId: string; currentStep: number; companyId: string },
    stepId: string
  ): Promise<boolean> {
    const step = await db.approval_steps.findFirst({
      where: { id: stepId, workflowId: request.workflowId },
    });

    if (!step) return false;

    // Check if step is current
    if (step.order !== request.currentStep) return false;

    // Check if user is delegated
    const delegation = await db.approval_delegations.findFirst({
      where: {
        fromUserId: userId,
        isActive: true,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
    });

    if (delegation) {
      // User has delegated their approval rights
      return false;
    }

    // Check if user is the delegated approver
    const receivedDelegation = await db.approval_delegations.findFirst({
      where: {
        toUserId: userId,
        isActive: true,
        startDate: { lte: new Date() },
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
          {
            OR: [
              { scope: 'all' },
              { scope: 'workflow', scopeIds: { contains: request.workflowId } },
              { scope: 'entityType', scopeIds: { contains: step.approverType } },
            ],
          },
        ],
      },
    });

    // Check direct approver
    if (step.approverType === 'user' && step.approverId === userId) {
      return true;
    }

    // Check role approver
    if (step.approverType === 'role') {
      const user = await db.users.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role === step.approverRole) {
        return true;
      }
    }

    // Check delegation
    if (receivedDelegation) {
      return true;
    }

    return false;
  }

  /**
   * Processa o resultado da decisão
   */
  private async processDecisionResult(
    request: {
      id: string;
      workflowId: string;
      currentStep: number;
      companyId: string;
      requestedBy: string;
      title: string;
      entityType: string;
      entityId: string;
    },
    decision: string,
    stepId: string
  ) {
    const workflow = await db.approval_workflows.findUnique({
      where: { id: request.workflowId },
      include: { approval_steps: { orderBy: { order: 'asc' } } },
    });

    if (!workflow) return;

    const currentStepIndex = workflow.approval_steps.findIndex(
      s => s.order === request.currentStep
    );
    const currentStep = workflow.approval_steps[currentStepIndex];

    if (decision === 'rejected') {
      // Reject entire request
      await db.approval_requests.update({
        where: { id: request.id },
        data: {
          status: 'rejected',
          completedAt: new Date(),
        },
      });

      await this.notifyRequester(request, 'rejected');
      return;
    }

    if (decision === 'returned') {
      // Return to previous step or requester
      const previousStep = workflow.approval_steps[currentStepIndex - 1];
      await db.approval_requests.update({
        where: { id: request.id },
        data: {
          currentStep: previousStep?.order ?? 1,
          status: previousStep ? 'in_progress' : 'pending',
        },
      });
      return;
    }

    if (decision === 'approved' || decision === 'delegated') {
      // Check if current step is complete
      const stepDecisions = await db.approval_decisions.count({
        where: {
          requestId: request.id,
          stepId,
          decision: 'approved',
        },
      });

      const isStepComplete =
        workflow.approvalOrder === 'any' ||
        stepDecisions >= (currentStep.minApprovals ?? 1);

      if (isStepComplete) {
        // Move to next step or complete
        const nextStep = workflow.approval_steps[currentStepIndex + 1];

        if (nextStep) {
          await db.approval_requests.update({
            where: { id: request.id },
            data: {
              currentStep: nextStep.order,
              status: 'in_progress',
            },
          });

          // Notify next step approvers
          await this.notifyApproversForStep(request, nextStep);
        } else {
          // All steps complete - approve request
          await db.approval_requests.update({
            where: { id: request.id },
            data: {
              status: 'approved',
              completedAt: new Date(),
            },
          });

          // Update entity status
          await this.updateEntityStatus(request);

          // Notify requester
          await this.notifyRequester(request, 'approved');
        }
      }
    }
  }

  /**
   * Atualiza o status da entidade após aprovação
   */
  private async updateEntityStatus(request: {
    entityType: string;
    entityId: string;
  }) {
    const updateData: Record<string, unknown> = {
      status: 'approved',
      approvedAt: new Date(),
    };

    switch (request.entityType) {
      case 'budget':
        await db.budgets.update({
          where: { id: request.entityId },
          data: updateData,
        });
        break;
      case 'purchase_order':
        await db.purchase_orders.update({
          where: { id: request.entityId },
          data: {
            status: 'aprovado',
            aprovadoEm: new Date(),
          },
        });
        break;
      case 'medicao':
        await db.medicoes.update({
          where: { id: request.entityId },
          data: {
            status: 'aprovada',
            aprovadoEm: new Date(),
          },
        });
        break;
      // Add other entity types as needed
    }
  }

  // ===========================================================================
  // Delegation Management
  // ===========================================================================

  /**
   * Cria uma delegação de aprovação
   */
  async createDelegation(input: CreateDelegationInput) {
    // Verify users exist and are in same company
    const [fromUser, toUser] = await Promise.all([
      db.users.findFirst({
        where: { id: input.fromUserId, companyId: input.companyId },
      }),
      db.users.findFirst({
        where: { id: input.toUserId, companyId: input.companyId },
      }),
    ]);

    if (!fromUser || !toUser) {
      throw new Error('Usuários não encontrados');
    }

    if (input.fromUserId === input.toUserId) {
      throw new Error('Não é possível delegar para si mesmo');
    }

    // Check for overlapping delegations
    const overlapping = await db.approval_delegations.findFirst({
      where: {
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: input.startDate } },
        ],
      },
    });

    if (overlapping) {
      throw new Error('Já existe uma delegação ativa entre estes usuários');
    }

    return db.approval_delegations.create({
      data: {
        companyId: input.companyId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        startDate: input.startDate,
        endDate: input.endDate,
        scope: input.scope ?? 'all',
        scopeIds: input.scopeIds ? JSON.stringify(input.scopeIds) : null,
        reason: input.reason,
        isActive: true,
      },
    });
  }

  /**
   * Lista delegações
   */
  async listDelegations(
    companyId: string,
    options?: {
      fromUserId?: string;
      toUserId?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { companyId };

    if (options?.fromUserId) where.fromUserId = options.fromUserId;
    if (options?.toUserId) where.toUserId = options.toUserId;
    if (options?.isActive !== undefined) where.isActive = options.isActive;

    const [delegations, total] = await Promise.all([
      db.approval_delegations.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users_approval_delegations_fromUserIdTousers: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          users_approval_delegations_toUserIdTousers: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      }),
      db.approval_delegations.count({ where }),
    ]);

    return {
      data: delegations.map(d => ({
        ...d,
        scopeIds: d.scopeIds ? JSON.parse(d.scopeIds) : null,
        fromUser: d.users_approval_delegations_fromUserIdTousers,
        toUser: d.users_approval_delegations_toUserIdTousers,
        users_approval_delegations_fromUserIdTousers: undefined,
        users_approval_delegations_toUserIdTousers: undefined,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Revoga uma delegação
   */
  async revokeDelegation(delegationId: string, companyId: string) {
    return db.approval_delegations.update({
      where: { id: delegationId, companyId },
      data: { isActive: false },
    });
  }

  // ===========================================================================
  // Notification Helpers
  // ===========================================================================

  /**
   * Notifica aprovadores de uma etapa
   */
  private async notifyApproversForStep(
    request: { id: string; title: string; companyId: string },
    step: { approverType: string; approverId: string | null; approverRole: string | null }
  ) {
    let userIds: string[] = [];

    if (step.approverType === 'user' && step.approverId) {
      userIds = [step.approverId];
    } else if (step.approverType === 'role' && step.approverRole) {
      const users = await db.users.findMany({
        where: { role: step.approverRole, companyId: request.companyId },
        select: { id: true },
      });
      userIds = users.map(u => u.id);
    }

    for (const userId of userIds) {
      await createNotification({
        companyId: request.companyId,
        userId,
        type: 'info',
        title: 'Nova solicitação de aprovação',
        message: `Você tem uma nova solicitação de aprovação: ${request.title}`,
        entityType: 'approval_request',
        entityId: request.id,
      });
    }
  }

  /**
   * Notifica o solicitante
   */
  private async notifyRequester(
    request: { id: string; requestedBy: string; companyId: string; title: string },
    event: 'created' | 'approved' | 'rejected' | 'cancelled'
  ) {
    const messages: Record<string, { title: string; message: string }> = {
      created: {
        title: 'Solicitação criada',
        message: `Sua solicitação "${request.title}" foi criada e está aguardando aprovação.`,
      },
      approved: {
        title: 'Solicitação aprovada',
        message: `Sua solicitação "${request.title}" foi aprovada!`,
      },
      rejected: {
        title: 'Solicitação rejeitada',
        message: `Sua solicitação "${request.title}" foi rejeitada.`,
      },
      cancelled: {
        title: 'Solicitação cancelada',
        message: `Sua solicitação "${request.title}" foi cancelada.`,
      },
    };

    const notification = messages[event];

    await createNotification({
      companyId: request.companyId,
      userId: request.requestedBy,
      type: event === 'approved' ? 'success' : event === 'rejected' ? 'warning' : 'info',
      title: notification.title,
      message: notification.message,
      entityType: 'approval_request',
      entityId: request.id,
    });
  }

  // ===========================================================================
  // Statistics and Dashboard
  // ===========================================================================

  /**
   * Obtém estatísticas de aprovações
   */
  async getStats(companyId: string, options?: { startDate?: Date; endDate?: Date }) {
    const where: Record<string, unknown> = { companyId };

    if (options?.startDate || options?.endDate) {
      where.createdAt = {
        ...(options.startDate && { gte: options.startDate }),
        ...(options.endDate && { lte: options.endDate }),
      };
    }

    const [totalRequests, pendingRequests, approvedRequests, rejectedRequests, avgDuration] =
      await Promise.all([
        db.approval_requests.count({ where }),
        db.approval_requests.count({ where: { ...where, status: { in: ['pending', 'in_progress'] } } }),
        db.approval_requests.count({ where: { ...where, status: 'approved' } }),
        db.approval_requests.count({ where: { ...where, status: 'rejected' } }),
        this.calculateAverageApprovalDuration(companyId),
      ]);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      avgApprovalDuration: avgDuration,
      approvalRate: totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0,
    };
  }

  /**
   * Calcula duração média de aprovação
   */
  private async calculateAverageApprovalDuration(companyId: string): Promise<number | null> {
    const approvedRequests = await db.approval_requests.findMany({
      where: { companyId, status: 'approved', completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
    });

    if (approvedRequests.length === 0) return null;

    const durations = approvedRequests.map(r => {
      const duration = r.completedAt!.getTime() - r.createdAt.getTime();
      return duration / (1000 * 60 * 60 * 24); // Convert to days
    });

    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }
}

// =============================================================================
// Export
// =============================================================================

export const approvalWorkflowService = new ApprovalWorkflowService();
