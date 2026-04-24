// =============================================================================
// ConstrutorPro - Composições API - List and Create
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, createPaginatedResponse, buildSortCondition } from '@/lib/api';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const compositionFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const compositionItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  unitCost: z.coerce.number().min(0, 'Custo unitário deve ser maior ou igual a zero'),
  itemType: z.enum(['material', 'labor', 'equipment', 'service', 'other']),
  materialId: z.string().optional().nullable(),
  coefficient: z.coerce.number().optional().nullable(),
  order: z.coerce.number().int().min(0).optional().default(0),
});

const createCompositionSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').max(50),
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  profitMargin: z.coerce.number().min(0).max(100).optional().default(30),
  isActive: z.boolean().optional().default(true),
  composition_items: z.array(compositionItemSchema).optional().default([]),
});

// -----------------------------------------------------------------------------
// GET - List Compositions
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());
  const parsed = compositionFiltersSchema.safeParse(params);

  if (!parsed.success) {
    return errorResponse('Parâmetros inválidos', 400);
  }

  const { page, limit, search, isActive, sortBy, sortOrder } = parsed.data;

  // Build where clause
  const where: Record<string, unknown> = {};

  // Company filter (master admin sees all)
  if (!isMasterAdmin) {
    where.companyId = companyId;
  }

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Active filter
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  // Get total count
  const total = await db.compositions.count({ where });

  // Get compositions with pagination
  const compositions = await db.compositions.findMany({
    where,
    include: {
      composition_items: {
        orderBy: { order: 'asc' },
        include: {
          compositions: {
            select: {
              unit: true,
            },
          },
        },
      },
      _count: {
        select: { composition_items: true },
      },
    },
    orderBy: buildSortCondition(sortBy, sortOrder),
    skip: (page - 1) * limit,
    take: limit,
  });

  return successResponse(createPaginatedResponse(compositions, total, page, limit));
}

// -----------------------------------------------------------------------------
// POST - Create Composition
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;

  // Parse and validate request body
  const bodyResult = await parseRequestBody(request, createCompositionSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data as z.infer<typeof createCompositionSchema>;

  // Determine company for the composition
  const compositionCompanyId = isMasterAdmin ? companyId : authResult.context!.companyId;

  // Check if code is unique within company
  const existingComposition = await db.compositions.findFirst({
    where: {
      companyId: compositionCompanyId,
      code: data.code,
    },
  });

  if (existingComposition) {
    return errorResponse('Já existe uma composição com este código', 400);
  }

  // Calculate total cost from items
  let totalCost = 0;
  const processedItems = data.composition_items.map((item, index) => {
    const itemTotalCost = item.quantity * item.unitCost;
    totalCost += itemTotalCost;
    return {
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: itemTotalCost,
      itemType: item.itemType,
      materialId: item.materialId,
      coefficient: item.coefficient,
      order: item.order ?? index,
    };
  });

  // Calculate total price with profit margin
  const totalPrice = totalCost * (1 + data.profitMargin / 100);

  // Create composition with items
  const composition = await db.compositions.create({
    data: {
      companyId: compositionCompanyId,
      code: data.code,
      name: data.name,
      description: data.description,
      unit: data.unit,
      totalCost,
      totalPrice,
      profitMargin: data.profitMargin ?? 30,
      isActive: data.isActive ?? true,
      composition_items: {
        create: processedItems,
      },
    },
    include: {
      composition_items: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return successResponse(composition, 'Composição criada com sucesso');
}
