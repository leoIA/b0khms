// =============================================================================
// ConstrutorPro - Approval Delegations API
// =============================================================================

import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { approvalWorkflowService } from '@/lib/approval-workflow';
import { z } from 'zod';

// =============================================================================
// Validação
// =============================================================================

const createDelegationSchema = z.object({
  toUserId: z.string().min(1),
  startDate: z.string().transform(v => new Date(v)),
  endDate: z.string().transform(v => v ? new Date(v) : undefined).optional(),
  scope: z.enum(['all', 'workflow', 'entityType']).optional(),
  scopeIds: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

// =============================================================================
// GET - Listar Delegações
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
    const result = await approvalWorkflowService.listDelegations(companyId, {
      fromUserId: searchParams.get('fromUserId') || undefined,
      toUserId: searchParams.get('toUserId') || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao listar delegações:', error);
    return errorResponse('Erro ao listar delegações', 500);
  }
}

// =============================================================================
// POST - Criar Delegação
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
    const validated = createDelegationSchema.parse(body);

    const delegation = await approvalWorkflowService.createDelegation({
      companyId,
      fromUserId: userId,
      ...validated,
    });

    return NextResponse.json(delegation, { status: 201 });
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
    console.error('Erro ao criar delegação:', error);
    return errorResponse('Erro ao criar delegação', 500);
  }
}
