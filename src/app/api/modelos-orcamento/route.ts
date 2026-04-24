// =============================================================================
// ConstrutorPro - Budget Templates API
// GET, POST /api/modelos-orcamento
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

const createBudgetTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  items: z.array(z.object({
    compositionId: z.string().optional(),
    description: z.string().min(1, 'Descrição é obrigatória'),
    unit: z.string().min(1, 'Unidade é obrigatória'),
    quantity: z.number().positive('Quantidade deve ser positiva'),
    unitPrice: z.number().min(0, 'Preço unitário deve ser não negativo').optional(),
    notes: z.string().optional(),
    order: z.number().optional(),
  })).min(1, 'Pelo menos um item é obrigatório'),
});

// -----------------------------------------------------------------------------
// GET - List Budget Templates
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
  const category = searchParams.get('category') || '';
  const isActive = searchParams.get('isActive');

  const { skip } = calculatePagination(page, limit);

  // Build where clause
  const where: Record<string, unknown> = {};

  if (!isMasterAdmin) {
    where.companyId = companyId;
  }

  if (search) {
    Object.assign(where, buildSearchCondition(['name', 'code'], search));
  }

  if (category) {
    where.category = category;
  }

  if (isActive !== null && isActive !== undefined && isActive !== '') {
    where.isActive = isActive === 'true';
  }

  // Get templates with counts
  const [templates, total] = await Promise.all([
    db.budget_templates.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        budget_template_items: {
          select: {
            id: true,
            description: true,
            unit: true,
            quantity: true,
            unitPrice: true,
            compositionId: true,
            compositions: {
              select: {
                id: true,
                code: true,
                name: true,
                totalPrice: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { budget_template_items: true },
        },
      },
    }),
    db.budget_templates.count({ where }),
  ]);

  // Format response
  const formattedTemplates = templates.map((template) => ({
    ...template,
    budget_template_items: template.budget_template_items.map((item) => ({
      ...item,
      quantity: typeof item.quantity === 'object' && 'toNumber' in item.quantity
        ? item.quantity.toNumber()
        : Number(item.quantity),
      unitPrice: typeof item.unitPrice === 'object' && 'toNumber' in item.unitPrice
        ? item.unitPrice.toNumber()
        : Number(item.unitPrice),
      compositions: item.compositions
        ? {
            ...item.compositions,
            totalPrice: typeof item.compositions.totalPrice === 'object' && 'toNumber' in item.compositions.totalPrice
              ? item.compositions.totalPrice.toNumber()
              : Number(item.compositions.totalPrice),
          }
        : null,
    })),
    totalValue: template.budget_template_items.reduce((sum, item) => {
      const price = typeof item.unitPrice === 'object' && 'toNumber' in item.unitPrice
        ? item.unitPrice.toNumber()
        : Number(item.unitPrice);
      const qty = typeof item.quantity === 'object' && 'toNumber' in item.quantity
        ? item.quantity.toNumber()
        : Number(item.quantity);
      return sum + price * qty;
    }, 0),
  }));

  return successResponse(createPaginatedResponse(formattedTemplates, total, page, limit));
}

// -----------------------------------------------------------------------------
// POST - Create Budget Template
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;

  const body = await request.json();
  const parseResult = createBudgetTemplateSchema.safeParse(body);

  if (!parseResult.success) {
    return errorResponse('Dados inválidos', 400, parseResult.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const data = parseResult.data;

  // Check code uniqueness
  if (data.code) {
    const existingTemplate = await db.budget_templates.findFirst({
      where: { companyId, code: data.code },
    });

    if (existingTemplate) {
      return errorResponse('Já existe um modelo com este código.', 400);
    }
  }

  // Validate compositions if provided
  for (const item of data.items) {
    if (item.compositionId) {
      const composition = await db.compositions.findFirst({
        where: { id: item.compositionId, companyId },
      });

      if (!composition) {
        return errorResponse(`Composição ${item.compositionId} não encontrada.`, 404);
      }
    }
  }

  // Create template with items
  const template = await db.budget_templates.create({
    data: {
      companyId,
      name: data.name,
      code: data.code,
      description: data.description,
      category: data.category,
      isActive: data.isActive ?? true,
      budget_template_items: {
        create: data.items.map((item, index) => ({
          compositionId: item.compositionId,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? 0,
          notes: item.notes,
          order: item.order ?? index,
        })),
      },
    },
    include: {
      budget_template_items: {
        orderBy: { order: 'asc' },
        include: {
          compositions: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return successResponse(template, 'Modelo de orçamento criado com sucesso.');
}
