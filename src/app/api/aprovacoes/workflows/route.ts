// =============================================================================
// ConstrutorPro - Approval Workflows API
// Gerenciamento de fluxos de aprovação
// =============================================================================

import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { approvalWorkflowService } from '@/lib/approval-workflow';
import { z } from 'zod';

// =============================================================================
// Validação
// =============================================================================

const createStepSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().min(1),
  approverType: z.enum(['user', 'role', 'manager', 'owner']),
  approverId: z.string().optional(),
  approverRole: z.string().optional(),
  isRequired: z.boolean().optional(),
  minApprovals: z.number().int().min(1).optional(),
  canEditData: z.boolean().optional(),
  canAddAttachments: z.boolean().optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
});

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  code: z.string().optional(),
  entityType: z.enum(['budget', 'purchase_order', 'transaction', 'medicao', 'project', 'quotation']),
  triggerMode: z.enum(['manual', 'auto', 'threshold']).optional(),
  thresholdMin: z.number().optional(),
  thresholdMax: z.number().optional(),
  isActive: z.boolean().optional(),
  allowDelegation: z.boolean().optional(),
  allowRejection: z.boolean().optional(),
  requireComment: z.boolean().optional(),
  notifyRequester: z.boolean().optional(),
  notifyApprovers: z.boolean().optional(),
  timeoutDays: z.number().int().optional(),
  escalationTo: z.string().optional(),
  autoApproveOnTimeout: z.boolean().optional(),
  approvalOrder: z.enum(['sequential', 'parallel', 'any']).optional(),
  steps: z.array(createStepSchema).min(1),
});

// =============================================================================
// GET - Listar Workflows
// =============================================================================

export async function GET(request: Request) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;
  const { searchParams } = new URL(request.url);

  try {
    const result = await approvalWorkflowService.listWorkflows(companyId, {
      entityType: searchParams.get('entityType') as any,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao listar workflows:', error);
    return errorResponse('Erro ao listar workflows', 500);
  }
}

// =============================================================================
// POST - Criar Workflow
// =============================================================================

export async function POST(request: Request) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;
  const userId = authResult.context!.user.id;

  try {
    const body = await request.json();
    const validated = createWorkflowSchema.parse(body);

    const workflow = await approvalWorkflowService.createWorkflow({
      companyId,
      createdBy: userId,
      ...validated,
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Dados inválidos', 400, error.issues.reduce((acc, err) => {
        acc[err.path.join('.')] = [err.message];
        return acc;
      }, {} as Record<string, string[]>));
    }
    console.error('Erro ao criar workflow:', error);
    return errorResponse('Erro ao criar workflow', 500);
  }
}
