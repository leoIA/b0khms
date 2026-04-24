// =============================================================================
// ConstrutorPro - Propostas Comerciais API - Single Proposal Operations
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { updateProposalSchema } from '@/validators/proposals';

// -----------------------------------------------------------------------------
// Helper - Recalculate Totals
// -----------------------------------------------------------------------------

function calculateTotals(items: Array<{ quantity: number; unitPrice: number }>): {
  subtotal: number;
} {
  let subtotal = 0;

  for (const item of items) {
    subtotal += item.quantity * item.unitPrice;
  }

  return { subtotal };
}

// -----------------------------------------------------------------------------
// GET - Get Proposal by ID
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
  const { companyId, isMasterAdmin } = context!;
  const { id } = await params;

  const proposal = await db.proposals.findFirst({
    where: {
      id,
      ...(isMasterAdmin ? {} : { companyId }),
    },
    include: {
      clients: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          mobile: true,
          cpfCnpj: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
        },
      },
      projects: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          address: true,
          city: true,
          state: true,
        },
      },
      budgets: {
        select: {
          id: true,
          name: true,
          code: true,
          totalValue: true,
        },
      },
      proposal_items: {
        orderBy: { order: 'asc' },
      },
      proposal_versions: {
        orderBy: { version: 'desc' },
        take: 10,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      proposal_followups: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          users: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      users_proposals_sentBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      users_proposals_approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!proposal) {
    return errorResponse('Proposta não encontrada.', 404);
  }

  return successResponse(proposal);
}

// -----------------------------------------------------------------------------
// PUT - Update Proposal
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, updateProposalSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;
  const companyId = context!.companyId;
  const userId = context!.user.id;
  const { id } = await params;

  // Check if proposal exists and belongs to company
  const existingProposal = await db.proposals.findFirst({
    where: { id, companyId },
    include: { proposal_items: true },
  });

  if (!existingProposal) {
    return errorResponse('Proposta não encontrada.', 404);
  }

  // Check if proposal can be edited (only draft or review status)
  if (!['draft', 'review'].includes(existingProposal.status)) {
    return errorResponse('Esta proposta não pode mais ser editada.', 400);
  }

  // Validate client if changing
  if (data.clientId !== undefined) {
    if (data.clientId) {
      const client = await db.clients.findFirst({
        where: { id: data.clientId, companyId },
      });
      if (!client) {
        return errorResponse('Cliente não encontrado.', 404);
      }
    }
  }

  // Validate project if changing
  if (data.projectId !== undefined) {
    if (data.projectId) {
      const project = await db.projects.findFirst({
        where: { id: data.projectId, companyId },
      });
      if (!project) {
        return errorResponse('Projeto não encontrado.', 404);
      }
    }
  }

  // Calculate totals if items provided
  let subtotal = Number(existingProposal.subtotal);
  let totalValue = Number(existingProposal.totalValue);

  if (data.items) {
    const totals = calculateTotals(data.items);
    subtotal = totals.subtotal;
    totalValue = subtotal;

    const discountType = data.discountType || existingProposal.discountType || 'percentage';
    const discountValue = data.discountValue ?? Number(existingProposal.discountValue) ?? 0;

    if (discountValue > 0) {
      if (discountType === 'percentage') {
        totalValue = subtotal * (1 - discountValue / 100);
      } else {
        totalValue = subtotal - discountValue;
      }
    }
  }

  // Update proposal
  const proposal = await db.$transaction(async (tx) => {
    // Update items if provided
    if (data.items) {
      // Delete existing items
      await tx.proposal_items.deleteMany({
        where: { proposalId: id },
      });

      // Create new items
      await tx.proposal_items.createMany({
        data: data.items.map((item, index) => ({
          proposalId: id,
          code: item.code,
          title: item.title,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
          unit: item.unit || 'un',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          details: item.details,
          includes: item.includes,
          excludes: item.excludes,
          notes: item.notes,
          order: item.order ?? index,
        })),
      });
    }

    // Update proposal
    return tx.proposals.update({
      where: { id },
      data: {
        title: data.title,
        objective: data.objective,
        clientId: data.clientId,
        projectId: data.projectId,
        budgetId: data.budgetId,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountReason: data.discountReason,
        subtotal,
        totalValue,
        paymentTerms: data.paymentTerms,
        deliveryTime: data.deliveryTime,
        warrantyTerms: data.warrantyTerms,
        validUntil: data.validUntil,
        deliveryAddress: data.deliveryAddress,
        terms: data.terms,
        notes: data.notes,
        clientNotes: data.clientNotes,
        includeCover: data.includeCover,
        includeSummary: data.includeSummary,
        includeTimeline: data.includeTimeline,
        includeTeam: data.includeTeam,
        includePortfolio: data.includePortfolio,
        customIntroduction: data.customIntroduction,
        coverImage: data.coverImage,
        requiresSignature: data.requiresSignature,
        version: { increment: 1 },
      },
      include: {
        clients: true,
        projects: true,
        proposal_items: {
          orderBy: { order: 'asc' },
        },
      },
    });
  });

  // Create version snapshot
  await db.proposal_versions.create({
    data: {
      proposalId: id,
      version: proposal.version,
      changedBy: userId,
      snapshot: JSON.stringify(proposal),
      itemsSnapshot: JSON.stringify(proposal.proposal_items),
      changeReason: 'Atualização da proposta',
    },
  });

  return successResponse(proposal, 'Proposta atualizada com sucesso.');
}

// -----------------------------------------------------------------------------
// DELETE - Delete Proposal
// -----------------------------------------------------------------------------

export async function DELETE(
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

  // Check if proposal can be deleted (only draft or cancelled status)
  if (!['draft', 'cancelled'].includes(proposal.status)) {
    return errorResponse('Esta proposta não pode ser excluída. Cancele-a primeiro.', 400);
  }

  // Delete proposal (cascade will delete items, versions, and followups)
  await db.proposals.delete({
    where: { id },
  });

  return successResponse(null, 'Proposta excluída com sucesso.');
}
