// =============================================================================
// ConstrutorPro - API Pública - Aceitar Proposta
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { z } from 'zod';

// Validation schema
const acceptProposalSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  notes: z.string().optional(),
});

// -----------------------------------------------------------------------------
// POST - Accept proposal
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
    const bodyResult = await parseRequestBody(request, acceptProposalSchema);
    if (!bodyResult.success) {
      return errorResponse(bodyResult.error, 400, bodyResult.details);
    }

    const { name, notes } = bodyResult.data;

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

    // Check if proposal can be accepted
    if (!['sent', 'viewed'].includes(proposal.status)) {
      return errorResponse('Esta proposta não pode mais ser aceita.', 400);
    }

    // Check if proposal is expired
    if (proposal.validUntil && new Date(proposal.validUntil) < new Date()) {
      return errorResponse('Esta proposta expirou.', 400);
    }

    // Get client IP and user agent for legal purposes
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Update proposal status
    const updatedProposal = await db.proposals.update({
      where: { id: proposal.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: name,
        acceptedIp: ip,
        acceptedUserAgent: userAgent,
        respondedAt: new Date(),
        responseNotes: notes || null,
        signedAt: proposal.requiresSignature ? new Date() : null,
        signedBy: proposal.requiresSignature ? name : null,
      },
    });

    // Create activity log
    await db.activities.create({
      data: {
        companyId: proposal.companyId,
        userId: 'system',
        userName: 'Sistema',
        action: 'accept',
        entityType: 'proposal',
        entityId: proposal.id,
        entityName: proposal.title,
        details: `Proposta aceita publicamente por ${name}`,
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
          title: 'Proposta Aceita',
          content: `Proposta aceita por ${name}. ${notes ? `Observações: ${notes}` : ''}`,
          status: 'completed',
        },
      });
    }

    return successResponse({
      accepted: true,
      acceptedAt: updatedProposal.acceptedAt,
    });
  } catch (error: any) {
    console.error('Error accepting proposal:', error);
    return errorResponse('Erro ao aceitar proposta.', 500);
  }
}
