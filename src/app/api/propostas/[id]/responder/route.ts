// =============================================================================
// ConstrutorPro - Propostas - Resposta do Cliente (Aceitar/Rejeitar)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseRequestBody } from '@/lib/api';
import { respondProposalSchema } from '@/validators/proposals';

// -----------------------------------------------------------------------------
// POST - Client Response (Accept/Reject)
// This endpoint is public (no auth required) for client responses via email link
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const bodyResult = await parseRequestBody(request, respondProposalSchema);
  if (!bodyResult.success) {
    return NextResponse.json({ error: bodyResult.error, details: bodyResult.details }, { status: 400 });
  }

  const data = bodyResult.data;
  const { id } = await params;

  // Check if proposal exists
  const proposal = await db.proposals.findFirst({
    where: { id, status: 'sent' },
    include: { clients: true },
  });

  if (!proposal) {
    return NextResponse.json({ error: 'Proposta não encontrada ou não está aguardando resposta.' }, { status: 404 });
  }

  // Check if proposal is still valid
  if (proposal.validUntil && new Date() > proposal.validUntil) {
    // Update to expired
    await db.proposals.update({
      where: { id },
      data: { status: 'expired' },
    });
    return NextResponse.json({ error: 'Esta proposta expirou.' }, { status: 400 });
  }

  // Get client info from request
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Update proposal status
  const updatedProposal = await db.proposals.update({
    where: { id },
    data: {
      status: data.action === 'accept' ? 'accepted' : 'rejected',
      respondedAt: new Date(),
      acceptedAt: data.action === 'accept' ? new Date() : null,
      acceptedBy: data.action === 'accept' ? data.acceptedBy || proposal.clients?.name : null,
      acceptedIp: data.action === 'accept' ? ipAddress : null,
      acceptedUserAgent: data.action === 'accept' ? userAgent : null,
      rejectedAt: data.action === 'reject' ? new Date() : null,
      rejectionReason: data.action === 'reject' ? data.reason : null,
    },
  });

  // Log activity
  await db.activities.create({
    data: {
      companyId: proposal.companyId,
      userId: proposal.sentBy || 'system',
      userName: data.acceptedBy || 'Cliente',
      action: data.action === 'accept' ? 'aceitou' : 'rejeitou',
      entityType: 'proposta',
      entityId: id,
      entityName: proposal.title,
      details: data.reason || (data.action === 'accept' ? 'Proposta aceita pelo cliente' : 'Proposta rejeitada pelo cliente'),
    },
  });

  return NextResponse.json({
    success: true,
    message: data.action === 'accept' ? 'Proposta aceita com sucesso!' : 'Proposta rejeitada.',
    proposal: {
      id: updatedProposal.id,
      number: updatedProposal.number,
      status: updatedProposal.status,
    },
  });
}
