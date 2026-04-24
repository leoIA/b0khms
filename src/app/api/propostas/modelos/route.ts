// =============================================================================
// ConstrutorPro - Templates de Propostas API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSearchCondition } from '@/lib/api';
import { createProposalTemplateSchema } from '@/validators/proposals';
import { paginationSchema } from '@/validators/auth';

// -----------------------------------------------------------------------------
// GET - List Templates
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const companyId = context!.companyId;

  const queryResult = parseQueryParams(request, paginationSchema);

  if (!queryResult.success) {
    return errorResponse(queryResult.error, 400);
  }

  const { page, limit, search, sortBy, sortOrder } = queryResult.data;
  const { skip } = calculatePagination(page, limit);

  const where = {
    companyId,
    isActive: true,
    ...buildSearchCondition(['name', 'code', 'description'], search),
  };

  const [templates, total] = await Promise.all([
    db.proposal_templates.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
    }),
    db.proposal_templates.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(templates, total, page, limit));
}

// -----------------------------------------------------------------------------
// POST - Create Template
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, createProposalTemplateSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;
  const companyId = context!.companyId;

  // Check code uniqueness if provided
  if (data.code) {
    const existingTemplate = await db.proposal_templates.findFirst({
      where: { companyId, code: data.code },
    });

    if (existingTemplate) {
      return errorResponse('Já existe um modelo com este código.', 400);
    }
  }

  // If setting as default, remove default from other templates
  if (data.isDefault) {
    await db.proposal_templates.updateMany({
      where: { companyId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await db.proposal_templates.create({
    data: {
      companyId,
      name: data.name,
      code: data.code,
      description: data.description,
      category: data.category,
      defaultTerms: data.defaultTerms,
      defaultPaymentTerms: data.defaultPaymentTerms,
      defaultWarranty: data.defaultWarranty,
      defaultValidDays: data.defaultValidDays,
      includeCover: data.includeCover,
      includeSummary: data.includeSummary,
      includeTimeline: data.includeTimeline,
      includeTeam: data.includeTeam,
      includePortfolio: data.includePortfolio,
      coverImage: data.coverImage,
      customIntroduction: data.customIntroduction,
      customStyles: data.customStyles,
      sectionsConfig: data.sectionsConfig,
      isActive: data.isActive,
      isDefault: data.isDefault,
    },
  });

  return successResponse(template, 'Modelo de proposta criado com sucesso.');
}
