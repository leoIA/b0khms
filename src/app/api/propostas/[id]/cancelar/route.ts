// =============================================================================
// ConstrutorPro - Propostas - Cancelar Proposta
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { z } from 'zod';

const cancelProposalSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// -----------------------------------------------------------------------------
// POST - Cancel Proposal
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional
  }

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

  // Check if proposal can be cancelled
  if (['accepted', 'cancelled', 'expired'].includes(proposal.status)) {
    return errorResponse('Esta proposta não pode ser cancelada.', 400);
  }

  // Update proposal status
  const updatedProposal = await db.proposals.update({
    where: { id },
    data: {
      status: 'cancelled',
      notes: body.reason ? `${proposal.notes || ''}\n\nMotivo do cancelamento: ${body.reason}` : proposal.notes,
    },
  });

  // Log activity
  await db.activities.create({
    data: {
      companyId,
      userId,
      userName: context!.user.name,
      action: 'cancelou',
      entityType: 'proposta',
      entityId: id,
      entityName: proposal.title,
      details: body.reason || 'Proposta cancelada',
    },
  });

  return successResponse(updatedProposal, 'Proposta cancelada com sucesso.');
}
