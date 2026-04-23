// =============================================================================
// ConstrutorPro - Quotation by ID API
// GET, PUT, DELETE /api/cotacoes/[id]
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOwnership, successResponse, errorResponse } from '@/server/auth';
import { getValidId, apiError } from '@/lib/api';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const updateQuotationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  code: z.string().optional(),
  projectId: z.string().nullable().optional(),
  description: z.string().optional(),
  deadline: z.string().nullable().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'responded', 'approved', 'rejected', 'cancelled']).optional(),
  quotation_items: z.array(z.object({
    id: z.string().optional(),
    description: z.string().min(1, 'Descrição é obrigatória'),
    unit: z.string().min(1, 'Unidade é obrigatória'),
    quantity: z.number().positive('Quantidade deve ser positiva'),
    notes: z.string().optional(),
    order: z.number().optional(),
  })).optional(),
});

// -----------------------------------------------------------------------------
// GET - Get Quotation by ID
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validId = getValidId({ id });

  if (!validId) {
    return apiError('ID inválido.', { status: 400 });
  }

  const authResult = await requireOwnership('quotation', validId);

  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  const quotation = await db.quotations.findUnique({
    where: { id: validId },
    include: {
      projects: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },
      quotation_items: {
        orderBy: { order: 'asc' },
      },
      quotation_responses: {
        include: {
          suppliers: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          quotation_response_items: {
            include: {
              quotation_items: true,
            },
          },
        },
      },
    },
  });

  if (!quotation) {
    return errorResponse('Cotação não encontrada.', 404);
  }

  // Format response
  const formattedQuotation = {
    ...quotation,
    quotation_items: quotation.quotation_items.map((item) => ({
      ...item,
      quantity: typeof item.quantity === 'object' && 'toNumber' in item.quantity
        ? item.quantity.toNumber()
        : Number(item.quantity),
    })),
    quotation_responses: quotation.quotation_responses.map((response) => ({
      ...response,
      totalValue: response.totalValue
        ? (typeof response.totalValue === 'object' && 'toNumber' in response.totalValue
            ? response.totalValue.toNumber()
            : Number(response.totalValue))
        : null,
      quotation_response_items: response.quotation_response_items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice
          ? (typeof item.unitPrice === 'object' && 'toNumber' in item.unitPrice
              ? item.unitPrice.toNumber()
              : Number(item.unitPrice))
          : null,
        totalPrice: item.totalPrice
          ? (typeof item.totalPrice === 'object' && 'toNumber' in item.totalPrice
              ? item.totalPrice.toNumber()
              : Number(item.totalPrice))
          : null,
      })),
    })),
  };

  return successResponse(formattedQuotation);
}

// -----------------------------------------------------------------------------
// PUT - Update Quotation
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validId = getValidId({ id });

  if (!validId) {
    return apiError('ID inválido.', { status: 400 });
  }

  const authResult = await requireOwnership('quotation', validId);

  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  const { companyId } = authResult.context!;

  const body = await request.json();
  const parseResult = updateQuotationSchema.safeParse(body);

  if (!parseResult.success) {
    return errorResponse('Dados inválidos', 400, parseResult.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const data = parseResult.data;

  // Check if quotation exists
  const existingQuotation = await db.quotations.findUnique({
    where: { id: validId },
  });

  if (!existingQuotation) {
    return errorResponse('Cotação não encontrada.', 404);
  }

  // Check code uniqueness
  if (data.code && data.code !== existingQuotation.code) {
    const duplicateQuotation = await db.quotations.findFirst({
      where: { companyId, code: data.code, NOT: { id: validId } },
    });

    if (duplicateQuotation) {
      return errorResponse('Já existe uma cotação com este código.', 400);
    }
  }

  // Validate project if provided
  if (data.projectId) {
    const project = await db.projects.findFirst({
      where: { id: data.projectId, companyId },
    });

    if (!project) {
      return errorResponse('Projeto não encontrado.', 404);
    }
  }

  // Update quotation
  const quotation = await db.$transaction(async (tx) => {
    // Update items if provided
    if (data.quotation_items) {
      // Delete existing items
      await tx.quotation_items.deleteMany({
        where: { quotationId: validId },
      });

      // Create new items
      await tx.quotation_items.createMany({
        data: data.quotation_items!.map((item, index) => ({
          quotationId: validId,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          notes: item.notes,
          order: item.order ?? index,
        })),
      });
    }

    // Update quotation
    return tx.quotations.update({
      where: { id: validId },
      data: {
        name: data.name,
        code: data.code,
        projectId: data.projectId,
        description: data.description,
        deadline: data.deadline ? new Date(data.deadline) : null,
        notes: data.notes,
        status: data.status,
      },
      include: {
        projects: {
          select: { id: true, name: true },
        },
        quotation_items: {
          orderBy: { order: 'asc' },
        },
        quotation_responses: {
          include: {
            suppliers: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  });

  return successResponse(quotation, 'Cotação atualizada com sucesso.');
}

// -----------------------------------------------------------------------------
// DELETE - Delete Quotation
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validId = getValidId({ id });

  if (!validId) {
    return apiError('ID inválido.', { status: 400 });
  }

  const authResult = await requireOwnership('quotation', validId);

  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  // Delete quotation (cascade will handle items and responses)
  await db.quotations.delete({
    where: { id: validId },
  });

  return successResponse(null, 'Cotação excluída com sucesso.');
}
