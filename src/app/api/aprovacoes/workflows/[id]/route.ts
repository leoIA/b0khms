// =============================================================================
// ConstrutorPro - Approval Workflow by ID API
// =============================================================================

import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { approvalWorkflowService } from '@/lib/approval-workflow';
import { z } from 'zod';

// =============================================================================
// Validação
// =============================================================================

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  code: z.string().optional(),
  entityType: z.enum(['budget', 'purchase_order', 'transaction', 'medicao', 'project', 'quotation']).optional(),
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
});

// =============================================================================
// GET - Obter Workflow por ID
// =============================================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;
  const { id } = await params;

  try {
    const workflow = await approvalWorkflowService.getWorkflow(id, companyId);

    if (!workflow) {
      return errorResponse('Workflow não encontrado', 404);
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Erro ao obter workflow:', error);
    return errorResponse('Erro ao obter workflow', 500);
  }
}

// =============================================================================
// PUT - Atualizar Workflow
// =============================================================================

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;
  const { id } = await params;

  try {
    const body = await request.json();
    const validated = updateWorkflowSchema.parse(body);

    const workflow = await approvalWorkflowService.updateWorkflow(id, companyId, validated);

    return NextResponse.json(workflow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Dados inválidos', 400, error.issues.reduce((acc, err) => {
        acc[err.path.join('.')] = [err.message];
        return acc;
      }, {} as Record<string, string[]>));
    }
    console.error('Erro ao atualizar workflow:', error);
    return errorResponse('Erro ao atualizar workflow', 500);
  }
}

// =============================================================================
// DELETE - Excluir Workflow
// =============================================================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;
  const { id } = await params;

  try {
    await approvalWorkflowService.deleteWorkflow(id, companyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('solicitações ativas')) {
      return errorResponse(error.message, 400);
    }
    console.error('Erro ao excluir workflow:', error);
    return errorResponse('Erro ao excluir workflow', 500);
  }
}
