// =============================================================================
// ConstrutorPro - Purchase Order by ID API Routes
// GET, PUT, DELETE /api/compras/[id]
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOwnership, errorResponse, successResponse } from '@/server/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schema
// -----------------------------------------------------------------------------

const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().optional(),
  projectId: z.string().nullable().optional(),
  dataEntrega: z.string().nullable().optional(),
  condicoesPagto: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['rascunho', 'enviado', 'confirmado', 'recebido', 'cancelado']).optional(),
  itens: z.array(z.object({
    id: z.string().optional(),
    materialId: z.string().nullable().optional(),
    descricao: z.string(),
    unidade: z.string(),
    quantidade: z.number().positive(),
    precoUnitario: z.number().positive(),
    ordem: z.number().optional(),
  })).optional(),
});

// -----------------------------------------------------------------------------
// GET /api/compras/[id] - Get Purchase Order by ID
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireOwnership('purchaseOrder', id);

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  try {
    const order = await db.purchase_orders.findUnique({
      where: { id },
      include: {
        suppliers: {
          select: {
            id: true,
            name: true,
            tradeName: true,
            cnpj: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            address: true,
            city: true,
            state: true,
          },
        },
        users_criadoPorTousers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        users_aprovadoPorTousers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        itens: {
          orderBy: { ordem: 'asc' },
          include: {
            materials: {
              select: {
                id: true,
                code: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return errorResponse('Pedido de compra não encontrado.', 404);
    }

    return NextResponse.json({
      data: {
        ...order,
        valorTotal: Number(order.valorTotal),
        itens: order.itens.map((item) => ({
          ...item,
          quantidade: Number(item.quantidade),
          quantidadeRec: Number(item.quantidadeRec),
          precoUnitario: Number(item.precoUnitario),
          valorTotal: Number(item.valorTotal),
        })),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return errorResponse('Erro ao carregar pedido', 500);
  }
}

// -----------------------------------------------------------------------------
// PUT /api/compras/[id] - Update Purchase Order
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireOwnership('purchaseOrder', id);

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;

  try {
    const body = await request.json();
    const parsed = updatePurchaseOrderSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Dados inválidos', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    // Check if order exists
    const existingOrder = await db.purchase_orders.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return errorResponse('Pedido de compra não encontrado.', 404);
    }

    // Validate supplier if provided
    if (data.supplierId) {
      const supplier = await db.suppliers.findFirst({
        where: { id: data.supplierId, companyId },
      });

      if (!supplier) {
        return errorResponse('Fornecedor não encontrado.', 404);
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

    // Calculate total if items provided
    const valorTotal = data.itens
      ? data.itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0)
      : undefined;

    // Update order
    const order = await db.$transaction(async (tx) => {
      // Update items if provided
      if (data.itens) {
        // Delete existing items
        await tx.purchase_order_items.deleteMany({
          where: { purchaseOrderId: id },
        });

        // Create new items
        await tx.purchase_order_items.createMany({
          data: data.itens!.map((item, index) => ({
            purchaseOrderId: id,
            materialId: item.materialId || null,
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade: item.quantidade,
            quantidadeRec: 0,
            precoUnitario: item.precoUnitario,
            valorTotal: item.quantidade * item.precoUnitario,
            ordem: item.ordem ?? index,
          })),
        });
      }

      // Update order
      return tx.purchase_orders.update({
        where: { id },
        data: {
          supplierId: data.supplierId,
          projectId: data.projectId,
          dataEntrega: data.dataEntrega ? new Date(data.dataEntrega) : null,
          condicoesPagto: data.condicoesPagto,
          observacoes: data.observacoes,
          status: data.status,
          valorTotal,
        },
        include: {
          suppliers: {
            select: { id: true, name: true },
          },
          projects: {
            select: { id: true, name: true },
          },
          itens: {
            orderBy: { ordem: 'asc' },
          },
        },
      });
    });

    return NextResponse.json({
      data: {
        ...order,
        valorTotal: Number(order.valorTotal),
        itens: order.itens.map((item) => ({
          ...item,
          quantidade: Number(item.quantidade),
          quantidadeRec: Number(item.quantidadeRec),
          precoUnitario: Number(item.precoUnitario),
          valorTotal: Number(item.valorTotal),
        })),
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    return errorResponse('Erro ao atualizar pedido', 500);
  }
}

// -----------------------------------------------------------------------------
// DELETE /api/compras/[id] - Delete Purchase Order
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireOwnership('purchaseOrder', id);

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  try {
    // Check if order exists
    const existingOrder = await db.purchase_orders.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return errorResponse('Pedido de compra não encontrado.', 404);
    }

    // Only allow deletion if status is draft
    if (existingOrder.status !== 'rascunho') {
      return errorResponse('Apenas pedidos em rascunho podem ser excluídos.', 400);
    }

    // Delete order (cascade will handle items)
    await db.purchase_orders.delete({
      where: { id },
    });

    return successResponse(null, 'Pedido de compra excluído com sucesso.');
  } catch (error) {
    console.error('Erro ao excluir pedido:', error);
    return errorResponse('Erro ao excluir pedido', 500);
  }
}
