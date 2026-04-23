// =============================================================================
// ConstrutorPro - Propostas - Aprovar/Rejeitar Internamente
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { approveProposalSchema } from '@/validators/proposals';

// -----------------------------------------------------------------------------
// POST - Internal Approval
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, approveProposalSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;
  const companyId = context!.companyId;
  const userId = context!.user.id;
  const { id } = await params;

  // Check if proposal exists and belongs to company
  const proposal = await db.proposals.findFirst({
    where: { id, companyId },
  });

  if (!proposal) {
    return errorResponse('Proposta não encontrada.', 404);
  }

  // Check if user has permission to approve
  const userRole = context!.user.role;
  if (!['master_admin', 'company_admin', 'manager'].includes(userRole)) {
    return errorResponse('Você não tem permissão para aprovar propostas.', 403);
  }

  // Update proposal
  const updatedProposal = await db.proposals.update({
    where: { id },
    data: {
      internalStatus: data.approved ? 'approved' : 'rejected',
      approvedAt: data.approved ? new Date() : null,
      approvedBy: data.approved ? userId : null,
      reviewNotes: data.notes,
      // If approved and was draft, move to review status
      status: data.approved && proposal.status === 'draft' ? 'review' : proposal.status,
    },
  });

  // Log activity
  await db.activities.create({
    data: {
      companyId,
      userId,
      userName: context!.user.name,
      action: data.approved ? 'aprovou' : 'rejeitou',
      entityType: 'proposta',
      entityId: id,
      entityName: proposal.title,
      details: data.notes || (data.approved ? 'Proposta aprovada internamente' : 'Proposta rejeitada internamente'),
    },
  });

  return successResponse(updatedProposal, data.approved ? 'Proposta aprovada com sucesso.' : 'Proposta rejeitada.');
}
