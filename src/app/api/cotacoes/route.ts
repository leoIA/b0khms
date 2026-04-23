// =============================================================================
// ConstrutorPro - Quotations API
// GET, POST /api/cotacoes
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  requireAuth,
  successResponse,
  errorResponse,
  createPaginatedResponse,
  calculatePagination,
} from '@/server/auth';
import { buildSearchCondition } from '@/lib/api';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const createQuotationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  projectId: z.string().optional(),
  description: z.string().optional(),
  deadline: z.string().optional(),
  notes: z.string().optional(),
  quotation_items: z.array(z.object({
    description: z.string().min(1, 'Descrição é obrigatória'),
    unit: z.string().min(1, 'Unidade é obrigatória'),
    quantity: z.number().positive('Quantidade deve ser positiva'),
    notes: z.string().optional(),
    order: z.number().optional(),
  })).min(1, 'Pelo menos um item é obrigatório'),
  supplierIds: z.array(z.string()).optional(),
});

// -----------------------------------------------------------------------------
// GET - List Quotations
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const projectId = searchParams.get('projectId') || '';

  const { skip } = calculatePagination(page, limit);

  // Build where clause
  const where: Record<string, unknown> = {};

  if (!isMasterAdmin) {
    where.companyId = companyId;
  }

  if (search) {
    Object.assign(where, buildSearchCondition(['name', 'code'], search));
  }

  if (status) {
    where.status = status;
  }

  if (projectId) {
    where.projectId = projectId;
  }

  // Get quotations with counts
  const [quotations, total] = await Promise.all([
    db.quotations.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        quotation_items: {
          select: {
            id: true,
            description: true,
            unit: true,
            quantity: true,
          },
          orderBy: { order: 'asc' },
        },
        quotation_responses: {
          select: {
            id: true,
            supplierId: true,
            status: true,
            totalValue: true,
            suppliers: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            quotation_items: true,
            quotation_responses: true,
          },
        },
      },
    }),
    db.quotations.count({ where }),
  ]);

  // Format response
  const formattedQuotations = quotations.map((quotation) => ({
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
    })),
  }));

  return successResponse(createPaginatedResponse(formattedQuotations, total, page, limit));
}

// -----------------------------------------------------------------------------
// POST - Create Quotation
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;

  const body = await request.json();
  const parseResult = createQuotationSchema.safeParse(body);

  if (!parseResult.success) {
    return errorResponse('Dados inválidos', 400, parseResult.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const data = parseResult.data;

  // Validate project if provided
  if (data.projectId) {
    const project = await db.projects.findFirst({
      where: { id: data.projectId, companyId },
    });

    if (!project) {
      return errorResponse('Projeto não encontrado.', 404);
    }
  }

  // Check code uniqueness
  if (data.code) {
    const existingQuotation = await db.quotations.findFirst({
      where: { companyId, code: data.code },
    });

    if (existingQuotation) {
      return errorResponse('Já existe uma cotação com este código.', 400);
    }
  }

  // Validate suppliers if provided
  let suppliers: { id: string }[] = [];
  if (data.supplierIds && data.supplierIds.length > 0) {
    suppliers = await db.suppliers.findMany({
      where: { id: { in: data.supplierIds }, companyId },
      select: { id: true },
    });

    if (suppliers.length !== data.supplierIds.length) {
      return errorResponse('Um ou mais fornecedores não foram encontrados.', 400);
    }
  }

  // Create quotation with items and responses
  const quotation = await db.$transaction(async (tx) => {
    // Create quotation
    const newQuotation = await tx.quotations.create({
      data: {
        companyId,
        name: data.name,
        code: data.code,
        projectId: data.projectId,
        description: data.description,
        deadline: data.deadline ? new Date(data.deadline) : null,
        notes: data.notes,
        status: 'draft',
        quotation_items: {
          create: data.quotation_items.map((item, index) => ({
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            notes: item.notes,
            order: item.order ?? index,
          })),
        },
      },
      include: {
        quotation_items: true,
      },
    });

    // Create responses for each supplier
    if (suppliers.length > 0) {
      await tx.quotation_responses.createMany({
        data: suppliers.map((supplier) => ({
          quotationId: newQuotation.id,
          supplierId: supplier.id,
          status: 'pending',
        })),
      });

      // Create response items for each supplier and quotation item
      for (const supplier of suppliers) {
        const response = await tx.quotation_responses.findFirst({
          where: { quotationId: newQuotation.id, supplierId: supplier.id },
        });

        if (response) {
          await tx.quotation_response_items.createMany({
            data: newQuotation.quotation_items.map((item) => ({
              quotationResponseId: response.id,
              quotationItemId: item.id,
            })),
          });
        }
      }
    }

    return newQuotation;
  });

  // Fetch complete quotation
  const completeQuotation = await db.quotations.findUnique({
    where: { id: quotation.id },
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

  return successResponse(completeQuotation, 'Cotação criada com sucesso.');
}
