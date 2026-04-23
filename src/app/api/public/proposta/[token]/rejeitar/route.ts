// =============================================================================
// ConstrutorPro - API Pública - Rejeitar Proposta
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { z } from 'zod';

// Validation schema
const rejectProposalSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  reason: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres'),
});

// -----------------------------------------------------------------------------
// POST - Reject proposal
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return errorResponse('Token não informado.', 400);
    }

    // Parse request body
    const bodyResult = await parseRequestBody(request, rejectProposalSchema);
    if (!bodyResult.success) {
      return errorResponse(bodyResult.error, 400, bodyResult.details);
    }

    const { name, reason } = bodyResult.data;

    // Find proposal by public token
    const proposal = await db.proposals.findFirst({
      where: {
        publicToken: token,
        isLatest: true,
      },
    });

    if (!proposal) {
      return errorResponse('Proposta não encontrada.', 404);
    }

    // Check if proposal can be rejected
    if (!['sent', 'viewed'].includes(proposal.status)) {
      return errorResponse('Esta proposta não pode mais ser rejeitada.', 400);
    }

    // Update proposal status
    const updatedProposal = await db.proposals.update({
      where: { id: proposal.id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: reason,
        respondedAt: new Date(),
      },
    });

    // Create activity log
    await db.activities.create({
      data: {
        companyId: proposal.companyId,
        userId: 'system',
        userName: 'Sistema',
        action: 'reject',
        entityType: 'proposal',
        entityId: proposal.id,
        entityName: proposal.title,
        details: `Proposta rejeitada publicamente por ${name}. Motivo: ${reason}`,
      },
    });

    // Create follow-up - need to find a system user or the proposal's sender
    const sender = await db.users.findFirst({
      where: { companyId: proposal.companyId },
      select: { id: true },
    });

    if (sender) {
      await db.proposal_followups.create({
        data: {
          proposalId: proposal.id,
          companyId: proposal.companyId,
          userId: sender.id,
          type: 'response',
          title: 'Proposta Rejeitada',
          content: `Proposta rejeitada por ${name}. Motivo: ${reason}`,
          status: 'completed',
        },
      });
    }

    return successResponse({
      rejected: true,
      rejectedAt: updatedProposal.rejectedAt,
    });
  } catch (error: any) {
    console.error('Error rejecting proposal:', error);
    return errorResponse('Erro ao rejeitar proposta.', 500);
  }
}
