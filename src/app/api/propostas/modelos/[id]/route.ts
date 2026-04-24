// =============================================================================
// ConstrutorPro - Templates de Propostas - Single Template Operations
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { updateProposalTemplateSchema } from '@/validators/proposals';

// -----------------------------------------------------------------------------
// GET - Get Template by ID
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

  const template = await db.proposal_templates.findFirst({
    where: { id, companyId },
  });

  if (!template) {
    return errorResponse('Modelo não encontrado.', 404);
  }

  return successResponse(template);
}

// -----------------------------------------------------------------------------
// PUT - Update Template
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, updateProposalTemplateSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;
  const companyId = context!.companyId;
  const { id } = await params;

  // Check if template exists and belongs to company
  const existingTemplate = await db.proposal_templates.findFirst({
    where: { id, companyId },
  });

  if (!existingTemplate) {
    return errorResponse('Modelo não encontrado.', 404);
  }

  // Check code uniqueness if changing
  if (data.code && data.code !== existingTemplate.code) {
    const duplicateCode = await db.proposal_templates.findFirst({
      where: { companyId, code: data.code, id: { not: id } },
    });

    if (duplicateCode) {
      return errorResponse('Já existe um modelo com este código.', 400);
    }
  }

  // If setting as default, remove default from other templates
  if (data.isDefault) {
    await db.proposal_templates.updateMany({
      where: { companyId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const template = await db.proposal_templates.update({
    where: { id },
    data: {
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

  return successResponse(template, 'Modelo atualizado com sucesso.');
}

// -----------------------------------------------------------------------------
// DELETE - Delete Template
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

  // Check if template exists and belongs to company
  const template = await db.proposal_templates.findFirst({
    where: { id, companyId },
  });

  if (!template) {
    return errorResponse('Modelo não encontrado.', 404);
  }

  // Hard delete
  await db.proposal_templates.delete({
    where: { id },
  });

  return successResponse(null, 'Modelo excluído com sucesso.');
}
