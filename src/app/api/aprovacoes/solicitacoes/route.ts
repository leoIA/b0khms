// =============================================================================
// ConstrutorPro - Approval Requests API
// Gerenciamento de solicitações de aprovação
// =============================================================================

import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { approvalWorkflowService } from '@/lib/approval-workflow';
import { z } from 'zod';

// =============================================================================
// Validação
// =============================================================================

const createRequestSchema = z.object({
  workflowId: z.string().min(1),
  entityType: z.enum(['budget', 'purchase_order', 'transaction', 'medicao', 'project', 'quotation']),
  entityId: z.string().min(1),
  entityData: z.record(z.string(), z.unknown()).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  value: z.number().optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  dueDate: z.string().transform(v => v ? new Date(v) : undefined).optional(),
  notes: z.string().optional(),
});

// =============================================================================
// GET - Listar Solicitações
// =============================================================================

export async function GET(request: Request) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;
  const userId = authResult.context!.user.id;
  const { searchParams } = new URL(request.url);

  try {
    const result = await approvalWorkflowService.listRequests(companyId, {
      workflowId: searchParams.get('workflowId') || undefined,
      entityType: searchParams.get('entityType') as any,
      status: searchParams.get('status')?.split(',') as any,
      requestedBy: searchParams.get('requestedBy') || undefined,
      pendingApprovalFor: searchParams.get('pendingApprovalFor') === 'me' ? userId : searchParams.get('pendingApprovalFor') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    return errorResponse('Erro ao listar solicitações', 500);
  }
}

// =============================================================================
// POST - Criar Solicitação
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
    const validated = createRequestSchema.parse(body);

    const approvalRequest = await approvalWorkflowService.createRequest({
      companyId,
      requestedBy: userId,
      ...validated,
    });

    return NextResponse.json(approvalRequest, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Dados inválidos', 400, error.issues.reduce((acc, err) => {
        acc[err.path.join('.')] = [err.message];
        return acc;
      }, {} as Record<string, string[]>));
    }
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    console.error('Erro ao criar solicitação:', error);
    return errorResponse('Erro ao criar solicitação', 500);
  }
}
