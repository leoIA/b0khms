// =============================================================================
// ConstrutorPro - Propostas - Duplicar Proposta
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';

// -----------------------------------------------------------------------------
// Helper - Generate Proposal Number
// -----------------------------------------------------------------------------

async function generateProposalNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();

  const count = await db.proposals.count({
    where: {
      companyId,
      number: { startsWith: `PROP-${year}-` }
    },
  });

  const sequential = (count + 1).toString().padStart(4, '0');
  return `PROP-${year}-${sequential}`;
}

// -----------------------------------------------------------------------------
// POST - Duplicate Proposal
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const companyId = context!.companyId;
  const userId = context!.user.id;
  const { id } = await params;

  // Check if proposal exists and belongs to company
  const originalProposal = await db.proposals.findFirst({
    where: { id, companyId },
    include: {
      proposal_items: { orderBy: { order: 'asc' } },
    },
  });

  if (!originalProposal) {
    return errorResponse('Proposta não encontrada.', 404);
  }

  // Generate new proposal number
  const number = await generateProposalNumber(companyId);

  // Create duplicated proposal
  const newProposal = await db.$transaction(async (tx) => {
    const proposal = await tx.proposals.create({
      data: {
        companyId,
        clientId: originalProposal.clientId,
        projectId: originalProposal.projectId,
        budgetId: originalProposal.budgetId,
        number,
        title: `${originalProposal.title} (Cópia)`,
        objective: originalProposal.objective,
        status: 'draft',
        internalStatus: 'internal_review',
        version: 1,
        isLatest: true,
        subtotal: originalProposal.subtotal,
        discountType: originalProposal.discountType,
        discountValue: originalProposal.discountValue,
        discountReason: originalProposal.discountReason,
        totalValue: originalProposal.totalValue,
        paymentTerms: originalProposal.paymentTerms,
        deliveryTime: originalProposal.deliveryTime,
        warrantyTerms: originalProposal.warrantyTerms,
        validUntil: originalProposal.validUntil ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null, // +30 days
        deliveryAddress: originalProposal.deliveryAddress,
        terms: originalProposal.terms,
        notes: originalProposal.notes,
        clientNotes: originalProposal.clientNotes,
        includeCover: originalProposal.includeCover,
        includeSummary: originalProposal.includeSummary,
        includeTimeline: originalProposal.includeTimeline,
        includeTeam: originalProposal.includeTeam,
        includePortfolio: originalProposal.includePortfolio,
        customIntroduction: originalProposal.customIntroduction,
        coverImage: originalProposal.coverImage,
        requiresSignature: originalProposal.requiresSignature,
        proposal_items: {
          create: originalProposal.proposal_items.map((item) => ({
            code: item.code,
            title: item.title,
            description: item.description,
            category: item.category,
            subcategory: item.subcategory,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            details: item.details,
            includes: item.includes,
            excludes: item.excludes,
            notes: item.notes,
            order: item.order,
          })),
        },
      },
      include: {
        clients: true,
        proposal_items: { orderBy: { order: 'asc' } },
      },
    });

    // Create initial version snapshot
    await tx.proposal_versions.create({
      data: {
        proposalId: proposal.id,
        version: 1,
        changedBy: userId,
        snapshot: JSON.stringify(proposal),
        itemsSnapshot: JSON.stringify(proposal.proposal_items),
        changeReason: 'Duplicada da proposta ' + originalProposal.number,
      },
    });

    return proposal;
  });

  // Log activity
  await db.activities.create({
    data: {
      companyId,
      userId,
      userName: context!.user.name,
      action: 'duplicou',
      entityType: 'proposta',
      entityId: newProposal.id,
      entityName: newProposal.title,
      details: `Duplicada de ${originalProposal.number}`,
    },
  });

  return successResponse(newProposal, 'Proposta duplicada com sucesso.');
}
