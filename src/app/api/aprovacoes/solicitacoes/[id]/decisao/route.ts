// =============================================================================
// ConstrutorPro - Approval Decision API
// =============================================================================

import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { approvalWorkflowService } from '@/lib/approval-workflow';
import { z } from 'zod';

// =============================================================================
// Validação
// =============================================================================

const createDecisionSchema = z.object({
  stepId: z.string().min(1),
  decision: z.enum(['approved', 'rejected', 'returned', 'delegated']),
  comment: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  attachments: z.array(z.string()).optional(),
});

// =============================================================================
// POST - Criar Decisão
// =============================================================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const userId = authResult.context!.user.id;
  const { id: requestId } = await params;

  try {
    const body = await request.json();
    const validated = createDecisionSchema.parse(body);

    const decision = await approvalWorkflowService.createDecision({
      requestId,
      stepId: validated.stepId,
      approverId: userId,
      decision: validated.decision,
      comment: validated.comment,
      data: validated.data,
      attachments: validated.attachments,
    });

    return NextResponse.json(decision, { status: 201 });
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
    console.error('Erro ao criar decisão:', error);
    return errorResponse('Erro ao criar decisão', 500);
  }
}
