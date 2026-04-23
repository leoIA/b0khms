// =============================================================================
// ConstrutorPro - Approval Stats API
// =============================================================================

import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { approvalWorkflowService } from '@/lib/approval-workflow';

export async function GET() {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;

  try {
    const stats = await approvalWorkflowService.getStats(companyId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return errorResponse('Erro ao obter estatísticas', 500);
  }
}
