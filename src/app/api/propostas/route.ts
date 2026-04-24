// =============================================================================
// ConstrutorPro - Propostas Comerciais API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSearchCondition } from '@/lib/api';
import { createProposalSchema, proposalFiltersSchema } from '@/validators/proposals';
import { Decimal } from '@prisma/client/runtime/library';

// -----------------------------------------------------------------------------
// Sort Field Validation
// -----------------------------------------------------------------------------

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'totalValue', 'validUntil', 'number'] as const;

function validateSortField(field: string | undefined): string {
  if (!field) return 'createdAt';
  return ALLOWED_SORT_FIELDS.includes(field as typeof ALLOWED_SORT_FIELDS[number])
    ? field
    : 'createdAt';
}

// -----------------------------------------------------------------------------
// Number Generator
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
// Calculate Totals
// -----------------------------------------------------------------------------

function calculateTotals(items: Array<{ quantity: number | Decimal; unitPrice: number | Decimal }>): {
  subtotal: number;
} {
  let subtotal = 0;

  for (const item of items) {
    const quantity = typeof item.quantity === 'object' ? Number(item.quantity) : item.quantity;
    const unitPrice = typeof item.unitPrice === 'object' ? Number(item.unitPrice) : item.unitPrice;
    subtotal += quantity * unitPrice;
  }

  return { subtotal };
}

// -----------------------------------------------------------------------------
// GET - List Proposals
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const { companyId, isMasterAdmin } = context!;

  const queryResult = parseQueryParams(request, proposalFiltersSchema);

  if (!queryResult.success) {
    return errorResponse(queryResult.error, 400);
  }

  const { page, limit, search, sortBy, sortOrder, status, clientId, projectId, dateFrom, dateTo, validFrom, validTo } = queryResult.data;
  const { skip } = calculatePagination(page, limit);

  // Build where clause
  const where = {
    // Company filter (master admin sees all)
    ...(isMasterAdmin ? {} : { companyId }),
    ...(status ? { status } : {}),
    ...(clientId ? { clientId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(dateFrom || dateTo ? {
      createdAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      }
    } : {}),
    ...(validFrom || validTo ? {
      validUntil: {
        ...(validFrom ? { gte: validFrom } : {}),
        ...(validTo ? { lte: validTo } : {}),
      }
    } : {}),
    ...buildSearchCondition(['title', 'number', 'objective'], search),
    isLatest: true, // Only show latest versions
  };

  const [proposals, total] = await Promise.all([
    db.proposals.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [validateSortField(sortBy)]: sortOrder || 'desc' },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
        _count: {
          select: { proposal_items: true },
        },
      },
    }),
    db.proposals.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(proposals, total, page, limit));
}

// -----------------------------------------------------------------------------
// POST - Create Proposal
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, createProposalSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;
  const companyId = context!.companyId;
  const userId = context!.user.id;

  // Validate client belongs to company if provided
  if (data.clientId) {
    const client = await db.clients.findFirst({
      where: { id: data.clientId, companyId },
    });
    if (!client) {
      return errorResponse('Cliente não encontrado.', 404);
    }
  }

  // Validate project belongs to company if provided
  if (data.projectId) {
    const project = await db.projects.findFirst({
      where: { id: data.projectId, companyId },
    });
    if (!project) {
      return errorResponse('Projeto não encontrado.', 404);
    }
  }

  // Validate budget belongs to company if provided
  if (data.budgetId) {
    const budget = await db.budgets.findFirst({
      where: { id: data.budgetId, companyId },
    });
    if (!budget) {
      return errorResponse('Orçamento não encontrado.', 404);
    }
  }

  // Generate proposal number
  const number = await generateProposalNumber(companyId);

  // Calculate totals
  const { subtotal } = calculateTotals(data.items);
  let totalValue = subtotal;

  // Apply discount
  if (data.discountValue && data.discountValue > 0) {
    if (data.discountType === 'percentage') {
      totalValue = subtotal * (1 - data.discountValue / 100);
    } else {
      totalValue = subtotal - data.discountValue;
    }
  }

  // Create proposal with items in transaction
  const proposal = await db.$transaction(async (tx) => {
    return tx.proposals.create({
      data: {
        companyId,
        clientId: data.clientId,
        projectId: data.projectId,
        budgetId: data.budgetId,
        number,
        title: data.title,
        objective: data.objective,
        status: 'draft',
        internalStatus: 'internal_review',
        subtotal,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountReason: data.discountReason,
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
        proposal_items: {
          create: data.items.map((item, index) => ({
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
        },
      },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        proposal_items: {
          orderBy: { order: 'asc' },
        },
      },
    });
  });

  // Create initial version snapshot
  await db.proposal_versions.create({
    data: {
      proposalId: proposal.id,
      version: 1,
      changedBy: userId,
      snapshot: JSON.stringify(proposal),
      itemsSnapshot: JSON.stringify(proposal.proposal_items),
      changeReason: 'Versão inicial',
    },
  });

  return successResponse(proposal, 'Proposta criada com sucesso.');
}
