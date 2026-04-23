// =============================================================================
// ConstrutorPro - Propostas - Enviar Proposta
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { sendProposalSchema } from '@/validators/proposals';
import { randomBytes } from 'crypto';

// -----------------------------------------------------------------------------
// Generate unique public token
// -----------------------------------------------------------------------------

function generatePublicToken(): string {
  return randomBytes(16).toString('hex');
}

// -----------------------------------------------------------------------------
// POST - Send Proposal to Client
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, sendProposalSchema);
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
    include: {
      clients: true,
      proposal_items: { orderBy: { order: 'asc' } },
    },
  });

  if (!proposal) {
    return errorResponse('Proposta não encontrada.', 404);
  }

  // Check if proposal can be sent
  if (!['draft', 'review'].includes(proposal.status)) {
    return errorResponse('Esta proposta já foi enviada.', 400);
  }

  // Check if proposal has client
  if (!proposal.clientId) {
    return errorResponse('A proposta precisa ter um cliente associado antes de ser enviada.', 400);
  }

  // Determine email destination
  const emailTo = data.emailTo || proposal.clients?.email;

  if (!emailTo) {
    return errorResponse('Cliente não possui email cadastrado. Forneça um email de destino.', 400);
  }

  // Generate public token for the proposal
  const publicToken = generatePublicToken();

  // Update proposal status with public token
  const updatedProposal = await db.proposals.update({
    where: { id },
    data: {
      status: 'sent',
      internalStatus: 'approved',
      sentAt: new Date(),
      sentBy: userId,
      publicToken,
    },
    include: {
      clients: true,
      proposal_items: { orderBy: { order: 'asc' } },
    },
  });

  // In a real application, you would send an email here
  // The email would include a link like: https://your-domain.com/proposta/{publicToken}

  // Log activity
  await db.activities.create({
    data: {
      companyId,
      userId,
      userName: context!.user.name,
      action: 'enviou',
      entityType: 'proposta',
      entityId: id,
      entityName: proposal.title,
      details: `Proposta enviada para ${emailTo}`,
    },
  });

  // Create follow-up
  await db.proposal_followups.create({
    data: {
      proposalId: id,
      companyId,
      userId,
      type: 'sent',
      title: 'Proposta Enviada',
      content: `Proposta enviada para ${emailTo}`,
      status: 'completed',
    },
  });

  return successResponse({
    proposal: updatedProposal,
    sentTo: emailTo,
    sentAt: updatedProposal.sentAt,
    publicUrl: `/proposta/${publicToken}`,
  }, 'Proposta enviada com sucesso.');
}
