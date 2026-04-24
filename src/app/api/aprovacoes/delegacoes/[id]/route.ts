// =============================================================================
// ConstrutorPro - Approval Delegation by ID API
// =============================================================================

import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { approvalWorkflowService } from '@/lib/approval-workflow';

// =============================================================================
// DELETE - Revogar Delegação
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
    await approvalWorkflowService.revokeDelegation(id, companyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao revogar delegação:', error);
    return errorResponse('Erro ao revogar delegação', 500);
  }
}
