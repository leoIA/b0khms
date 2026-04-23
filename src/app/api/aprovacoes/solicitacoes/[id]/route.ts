// =============================================================================
// ConstrutorPro - Approval Request by ID API
// =============================================================================

import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { approvalWorkflowService } from '@/lib/approval-workflow';
import { z } from 'zod';

// =============================================================================
// Validação
// =============================================================================

const cancelRequestSchema = z.object({
  reason: z.string().optional(),
});

// =============================================================================
// GET - Obter Solicitação por ID
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
    const approvalRequest = await approvalWorkflowService.getRequest(id, companyId);

    if (!approvalRequest) {
      return errorResponse('Solicitação não encontrada', 404);
    }

    return NextResponse.json(approvalRequest);
  } catch (error) {
    console.error('Erro ao obter solicitação:', error);
    return errorResponse('Erro ao obter solicitação', 500);
  }
}

// =============================================================================
// POST - Cancelar Solicitação
// =============================================================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;
  const userId = authResult.context!.user.id;
  const { id } = await params;

  try {
    const body = await request.json();
    const validated = cancelRequestSchema.parse(body);

    const approvalRequest = await approvalWorkflowService.cancelRequest(
      id,
      companyId,
      userId,
      validated.reason
    );

    return NextResponse.json(approvalRequest);
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
    console.error('Erro ao cancelar solicitação:', error);
    return errorResponse('Erro ao cancelar solicitação', 500);
  }
}
