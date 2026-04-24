// =============================================================================
// ConstrutorPro - Medições API - Individual CRUD
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const updateMedicaoSchema = z.object({
  dataInicio: z.string().transform((val) => new Date(val)).optional(),
  dataFim: z.string().transform((val) => new Date(val)).optional(),
  observacoes: z.string().optional().nullable(),
  status: z.enum(['rascunho', 'aprovada', 'paga', 'cancelada']).optional(),
  medicao_items: z.array(z.object({
    id: z.string().optional(),
    composicaoId: z.string().min(1, 'Composição é obrigatória'),
    descricao: z.string().min(1, 'Descrição é obrigatória'),
    unidade: z.string().min(1, 'Unidade é obrigatória'),
    quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero'),
    quantidadeAnt: z.coerce.number().min(0).optional().default(0),
    valorUnitario: z.coerce.number().min(0, 'Valor unitário deve ser maior ou igual a zero'),
    observacao: z.string().optional().nullable(),
    ordem: z.coerce.number().int().min(0).optional().default(0),
  })).optional(),
});

// -----------------------------------------------------------------------------
// Helper - Check Medição Access
// -----------------------------------------------------------------------------

async function checkMedicaoAccess(
  medicaoId: string,
  companyId: string | null,
  isMasterAdmin: boolean
) {
  const where: Record<string, unknown> = { id: medicaoId };
  if (!isMasterAdmin && companyId) {
    where.companyId = companyId;
  }

  return db.medicoes.findFirst({
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
      medicao_items: {
        include: {
          compositions: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true,
            },
          },
        },
        orderBy: { ordem: 'asc' },
      },
    },
  });
}

// -----------------------------------------------------------------------------
// GET - Get Medição by ID
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;
  const { id } = await params;

  const medicao = await checkMedicaoAccess(id, companyId, isMasterAdmin);

  if (!medicao) {
    return errorResponse('Medição não encontrada', 404);
  }

  return successResponse(medicao);
}

// -----------------------------------------------------------------------------
// PUT - Update Medição
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin, user } = authResult.context!;
  const { id } = await params;
  const userId = user.id;

  const medicao = await checkMedicaoAccess(id, companyId, isMasterAdmin);

  if (!medicao) {
    return errorResponse('Medição não encontrada', 404);
  }

  // Only allow updates if status is rascunho
  if (medicao.status !== 'rascunho') {
    return errorResponse('Apenas medições em rascunho podem ser editadas', 400);
  }

  // Parse and validate request body
  const bodyResult = await parseRequestBody(request, updateMedicaoSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data as z.infer<typeof updateMedicaoSchema>;

  // Validate dates
  const dataInicio = data.dataInicio ?? medicao.dataInicio;
  const dataFim = data.dataFim ?? medicao.dataFim;
  if (dataFim < dataInicio) {
    return errorResponse('Data fim não pode ser anterior à data início', 400);
  }

  // Update medicao with items
  const updatedMedicao = await db.$transaction(async (tx) => {
    // Handle items update if provided
    if (data.medicao_items) {
      // Delete existing items
      await tx.medicao_items.deleteMany({
        where: { medicaoId: id },
      });

      // Calculate total value
      let valorTotal = 0;
      const processedItems = data.medicao_items!.map((item, index) => {
        const valorTotalItem = item.quantidade * item.valorUnitario;
        valorTotal += valorTotalItem;
        return {
          medicaoId: id,
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

      // Create new items
      await tx.medicao_items.createMany({
        data: processedItems,
      });

      // Update medicao with new total
      return tx.medicoes.update({
        where: { id },
        data: {
          dataInicio: data.dataInicio,
          dataFim: data.dataFim,
          observacoes: data.observacoes,
          valorTotal,
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
    }

    // Update without items
    return tx.medicoes.update({
      where: { id },
      data: {
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        observacoes: data.observacoes,
        status: data.status,
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
  });

  return successResponse(updatedMedicao, 'Medição atualizada com sucesso');
}

// -----------------------------------------------------------------------------
// DELETE - Delete Medição
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;
  const { id } = await params;

  const medicao = await checkMedicaoAccess(id, companyId, isMasterAdmin);

  if (!medicao) {
    return errorResponse('Medição não encontrada', 404);
  }

  // Only allow deletion if status is rascunho
  if (medicao.status !== 'rascunho') {
    return errorResponse('Apenas medições em rascunho podem ser excluídas', 400);
  }

  // Delete medicao (items will be cascade deleted)
  await db.medicoes.delete({
    where: { id },
  });

  return successResponse(null, 'Medição excluída com sucesso');
}

// -----------------------------------------------------------------------------
// PATCH - Approve/Pay Medição
// -----------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin, user } = authResult.context!;
  const { id } = await params;
  const userId = user.id;

  const medicao = await checkMedicaoAccess(id, companyId, isMasterAdmin);

  if (!medicao) {
    return errorResponse('Medição não encontrada', 404);
  }

  const body = await request.json();
  const action = body.action as 'aprovar' | 'pagar' | 'cancelar' | undefined;

  if (!action) {
    return errorResponse('Ação não especificada', 400);
  }

  // Validate status transitions
  if (action === 'aprovar') {
    if (medicao.status !== 'rascunho') {
      return errorResponse('Apenas medições em rascunho podem ser aprovadas', 400);
    }
  } else if (action === 'pagar') {
    if (medicao.status !== 'aprovada') {
      return errorResponse('Apenas medições aprovadas podem ser marcadas como pagas', 400);
    }
  } else if (action === 'cancelar') {
    if (medicao.status === 'paga') {
      return errorResponse('Medições pagas não podem ser canceladas', 400);
    }
  }

  // Update status
  const statusMap = {
    aprovar: 'aprovada',
    pagar: 'paga',
    cancelar: 'cancelada',
  } as const;

  const updateData: Record<string, unknown> = {
    status: statusMap[action],
  };

  if (action === 'aprovar') {
    updateData.aprovadoPor = userId;
    updateData.aprovadoEm = new Date();
  }

  const updatedMedicao = await db.medicoes.update({
    where: { id },
    data: updateData,
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

  return successResponse(updatedMedicao, `Medição ${action === 'aprovar' ? 'aprovada' : action === 'pagar' ? 'marcada como paga' : 'cancelada'} com sucesso`);
}
