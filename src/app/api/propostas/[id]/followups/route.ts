// =============================================================================
// ConstrutorPro - Propostas - Follow-ups
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { createFollowupSchema } from '@/validators/proposals';

// -----------------------------------------------------------------------------
// GET - List Follow-ups
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const companyId = context!.companyId;
  const { id } = await params;

  // Check if proposal exists and belongs to company
  const proposal = await db.proposals.findFirst({
    where: { id, companyId },
  });

  if (!proposal) {
    return errorResponse('Proposta não encontrada.', 404);
  }

  const followups = await db.proposal_followups.findMany({
    where: { proposalId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return successResponse(followups);
}

// -----------------------------------------------------------------------------
// POST - Create Follow-up
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, createFollowupSchema);
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

  // Create follow-up
  const followup = await db.proposal_followups.create({
    data: {
      proposalId: id,
      companyId,
      userId,
      type: data.type,
      title: data.title,
      content: data.content,
      scheduledAt: data.scheduledAt,
      status: 'pending',
    },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Log activity
  await db.activities.create({
    data: {
      companyId,
      userId,
      userName: context!.user.name,
      action: 'criou follow-up',
      entityType: 'proposta',
      entityId: id,
      entityName: proposal.title,
      details: `${data.type}: ${data.title}`,
    },
  });

  return successResponse(followup, 'Follow-up criado com sucesso.');
}
