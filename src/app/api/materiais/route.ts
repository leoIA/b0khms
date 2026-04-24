// =============================================================================
// ConstrutorPro - Materiais API - List and Create
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, createPaginatedResponse, buildSortCondition } from '@/lib/api';
import { createLowStockAlert } from '@/lib/alerts';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const materialFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  category: z.string().optional(),
  supplierId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  lowStock: z.coerce.boolean().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const createMaterialSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').max(50),
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  unitCost: z.coerce.number().min(0, 'Custo unitário deve ser maior ou igual a zero'),
  unitPrice: z.coerce.number().min(0).optional(),
  supplierId: z.string().optional().nullable(),
  stockQuantity: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().min(0).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

// -----------------------------------------------------------------------------
// GET - List Materials
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
  const parsed = materialFiltersSchema.safeParse(params);

  if (!parsed.success) {
    return errorResponse('Parâmetros inválidos', 400, parsed.error.flatten().fieldErrors);
  }

  const { page, limit, search, category, supplierId, isActive, lowStock, sortBy, sortOrder } = parsed.data;

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

  // Category filter
  if (category) {
    where.category = category;
  }

  // Supplier filter
  if (supplierId) {
    where.supplierId = supplierId;
  }

  // Active filter
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  // Low stock filter - only filter by not null at DB level
  // Actual comparison will be done in memory since SQLite doesn't support field comparison in WHERE
  const needsLowStockFilter = lowStock === true;

  // For low stock filter, we need to fetch all matching materials first, then filter in memory
  // This is necessary because SQLite doesn't support comparing two columns in WHERE clause
  let materialsWithStockStatus;
  let filteredTotal: number;

  if (needsLowStockFilter) {
    // Fetch all materials with not null stock fields
    const allMaterials = await db.materials.findMany({
      where: {
        ...where,
        stockQuantity: { not: null },
        minStock: { not: null },
      },
      include: {
        suppliers: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: buildSortCondition(sortBy, sortOrder),
    });

    // Filter for low stock in memory
    const lowStockMaterials = allMaterials.filter(m => 
      m.stockQuantity !== null && 
      m.minStock !== null && 
      m.stockQuantity < m.minStock
    );

    filteredTotal = lowStockMaterials.length;

    // Apply pagination in memory
    const paginatedMaterials = lowStockMaterials.slice((page - 1) * limit, page * limit);

    materialsWithStockStatus = paginatedMaterials.map((material) => ({
      ...material,
      isLowStock: true,
    }));
  } else {
    // Normal flow without low stock filter
    const total = await db.materials.count({ where });

    const materials = await db.materials.findMany({
      where,
      include: {
        suppliers: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: buildSortCondition(sortBy, sortOrder),
      skip: (page - 1) * limit,
      take: limit,
    });

    materialsWithStockStatus = materials.map((material) => ({
      ...material,
      isLowStock: material.stockQuantity !== null &&
                  material.minStock !== null &&
                  material.stockQuantity < material.minStock,
    }));

    filteredTotal = total;
  }

  return successResponse(createPaginatedResponse(materialsWithStockStatus, filteredTotal, page, limit));
}

// -----------------------------------------------------------------------------
// POST - Create Material
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;

  // Parse and validate request body
  const bodyResult = await parseRequestBody(request, createMaterialSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data as z.infer<typeof createMaterialSchema>;

  // Determine company for the material
  const materialCompanyId = isMasterAdmin ? companyId : authResult.context!.companyId;

  // Check if code is unique within company
  const existingMaterial = await db.materials.findFirst({
    where: {
      companyId: materialCompanyId,
      code: data.code,
    },
  });

  if (existingMaterial) {
    return errorResponse('Já existe um material com este código', 400);
  }

  // Validate supplier if provided
  if (data.supplierId) {
    const supplier = await db.suppliers.findFirst({
      where: {
        id: data.supplierId,
        companyId: materialCompanyId,
      },
    });

    if (!supplier) {
      return errorResponse('Fornecedor não encontrado', 400);
    }
  }

  // Create material
  const material = await db.materials.create({
    data: {
      companyId: materialCompanyId,
      code: data.code,
      name: data.name,
      description: data.description,
      unit: data.unit,
      unitCost: data.unitCost,
      unitPrice: data.unitPrice,
      supplierId: data.supplierId,
      stockQuantity: data.stockQuantity,
      minStock: data.minStock,
      category: data.category,
      isActive: data.isActive ?? true,
    },
    include: {
      suppliers: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  // Check for low stock alert
  if (data.stockQuantity !== null && data.stockQuantity !== undefined && 
      data.minStock !== null && data.minStock !== undefined && 
      data.stockQuantity < data.minStock) {
    try {
      await createLowStockAlert(
        materialCompanyId,
        material.id,
        material.name,
        data.stockQuantity,
        data.minStock
      );
    } catch (error) {
      console.error('Erro ao criar alerta de estoque baixo:', error);
      // Don't fail the request if alert creation fails
    }
  }

  return successResponse(material, 'Material criado com sucesso');
}
