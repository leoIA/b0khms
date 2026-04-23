// =============================================================================
// ConstrutorPro - Medições API - List and Create
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const medicaoFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  projectId: z.string().optional(),
  status: z.enum(['rascunho', 'aprovada', 'paga', 'cancelada']).optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const medicaoItemSchema = z.object({
  composicaoId: z.string().min(1, 'Composição é obrigatória'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  quantidadeAnt: z.coerce.number().min(0).optional().default(0),
  valorUnitario: z.coerce.number().min(0, 'Valor unitário deve ser maior ou igual a zero'),
  observacao: z.string().optional().nullable(),
  ordem: z.coerce.number().int().min(0).optional().default(0),
});

const createMedicaoSchema = z.object({
  projectId: z.string().min(1, 'Projeto é obrigatório'),
  dataInicio: z.string().transform((val) => new Date(val)),
  dataFim: z.string().transform((val) => new Date(val)),
  observacoes: z.string().optional().nullable(),
  medicao_items: z.array(medicaoItemSchema).min(1, 'Pelo menos um item é obrigatório'),
});

// -----------------------------------------------------------------------------
// Sort Field Validation
// -----------------------------------------------------------------------------

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'numero', 'dataInicio', 'dataFim', 'valorTotal', 'status'] as const;

function validateSortField(field: string | undefined): string {
  if (!field) return 'createdAt';
  return ALLOWED_SORT_FIELDS.includes(field as typeof ALLOWED_SORT_FIELDS[number])
    ? field
    : 'createdAt';
}

// -----------------------------------------------------------------------------
// GET - List Medições
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;

  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());
  const parsed = medicaoFiltersSchema.safeParse(params);

  if (!parsed.success) {
    return errorResponse('Parâmetros inválidos', 400);
  }

  const { page, limit, search, projectId, status, sortBy, sortOrder } = parsed.data;

  // Build where clause
  const where: Record<string, unknown> = {};

  // Company filter (master admin sees all)
  if (!isMasterAdmin) {
    where.companyId = companyId;
  }

  // Project filter
  if (projectId) {
    where.projectId = projectId;
  }

  // Status filter
  if (status) {
    where.status = status;
  }

  // Search filter (by project name or numero)
  if (search) {
    where.OR = [
      { projects: { name: { contains: search, mode: 'insensitive' } } },
      { numero: { equals: parseInt(search) || 0 } },
    ];
  }

  // Get total count
  const total = await db.medicoes.count({ where });

  // Get medicoes with pagination
  const medicoes = await db.medicoes.findMany({
    where,
    include: {
      projects: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },
      users_medicoes_criadoPorTousers: {
        select: {
          id: true,
          name: true,
        },
      },
      users_medicoes_aprovadoPorTousers: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { medicao_items: true },
      },
    },
    orderBy: { [validateSortField(sortBy)]: sortOrder },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Create paginated response
  const totalPages = Math.ceil(total / limit);
  const response = {
    data: medicoes,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };

  return successResponse(response);
}

// -----------------------------------------------------------------------------
// POST - Create Medição
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin, user } = authResult.context!;
  const userId = user.id;

  // Parse and validate request body
  const bodyResult = await parseRequestBody(request, createMedicaoSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data as z.infer<typeof createMedicaoSchema>;

  // Determine company for the medicao
  const medicaoCompanyId = isMasterAdmin ? companyId : authResult.context!.companyId;

  // Validate project belongs to company
  const project = await db.projects.findFirst({
    where: {
      id: data.projectId,
      companyId: medicaoCompanyId,
    },
  });

  if (!project) {
    return errorResponse('Projeto não encontrado', 404);
  }

  // Validate dates
  if (data.dataFim < data.dataInicio) {
    return errorResponse('Data fim não pode ser anterior à data início', 400);
  }

  // Get next numero for the project
  const lastMedicao = await db.medicoes.findFirst({
    where: { projectId: data.projectId },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });

  const numero = (lastMedicao?.numero ?? 0) + 1;

  // Calculate total value
  let valorTotal = 0;
  const processedItems = data.medicao_items.map((item, index) => {
    const valorTotalItem = item.quantidade * item.valorUnitario;
    valorTotal += valorTotalItem;
    return {
      composicaoId: item.composicaoId,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      quantidadeAnt: item.quantidadeAnt ?? 0,
      valorUnitario: item.valorUnitario,
      valorTotal: valorTotalItem,
      observacao: item.observacao,
      ordem: item.ordem ?? index,
    };
  });

  // Validate compositions exist
  const composicaoIds = [...new Set(data.medicao_items.map((item) => item.composicaoId))];
  const composicoes = await db.compositions.findMany({
    where: {
      id: { in: composicaoIds },
    },
    select: { id: true },
  });

  if (composicoes.length !== composicaoIds.length) {
    const foundIds = composicoes.map((c) => c.id);
    const missingIds = composicaoIds.filter((id) => !foundIds.includes(id));
    return errorResponse(`Composições não encontradas: ${missingIds.join(', ')}`, 404);
  }

  // Create medicao with items in a transaction
  const medicao = await db.$transaction(async (tx) => {
    const created = await tx.medicoes.create({
      data: {
        companyId: medicaoCompanyId!,
        projectId: data.projectId,
        numero,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        observacoes: data.observacoes,
        criadoPor: userId,
        valorTotal,
        medicao_items: {
          create: processedItems,
        },
      },
      include: {
        projects: true,
        medicao_items: {
          include: {
            compositions: true,
          },
          orderBy: { ordem: 'asc' },
        },
      },
    });

    return created;
  });

  return successResponse(medicao, 'Medição criada com sucesso');
}
