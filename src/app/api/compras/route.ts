// =============================================================================
// ConstrutorPro - Compras API
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { db } from '@/lib/db';

// GET - Listar pedidos de compra
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;
  const userId = authResult.context!.user.id;
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const projectId = searchParams.get('projectId');
  const supplierId = searchParams.get('supplierId');

  const companyFilter = isMasterAdmin ? {} : { companyId };

  try {
    const where = {
      ...companyFilter,
      ...(status && status !== 'all' && { status: status as string }),
      ...(projectId && { projectId }),
      ...(supplierId && { supplierId }),
      ...(search && {
        OR: [
          { numero: { contains: search } },
          { suppliers: { name: { contains: search } } },
          { projects: { name: { contains: search } } },
        ],
      }),
    };

    const [orders, total] = await Promise.all([
      db.purchase_orders.findMany({
        where,
        include: {
          suppliers: {
            select: { id: true, name: true, tradeName: true, cnpj: true },
          },
          projects: {
            select: { id: true, name: true, code: true },
          },
          users_criadoPorTousers: {
            select: { id: true, name: true },
          },
          itens: {
            orderBy: { ordem: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.purchase_orders.count({ where }),
    ]);

    // Calcular estatísticas
    const stats = await db.purchase_orders.aggregate({
      where: companyFilter,
      _count: true,
      _sum: { valorTotal: true },
    });

    const statusCounts = await db.purchase_orders.groupBy({
      by: ['status'],
      where: companyFilter,
      _count: true,
    });

    return NextResponse.json({
      data: orders.map((order) => ({
        ...order,
        valorTotal: Number(order.valorTotal),
        itens: order.itens.map((item) => ({
          ...item,
          quantidade: Number(item.quantidade),
          quantidadeRec: Number(item.quantidadeRec),
          precoUnitario: Number(item.precoUnitario),
          valorTotal: Number(item.valorTotal),
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: stats._count,
        valorTotal: Number(stats._sum.valorTotal || 0),
        byStatus: statusCounts.reduce((acc, s) => {
          acc[s.status] = s._count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    return errorResponse('Erro ao carregar pedidos', 500);
  }
}

// POST - Criar pedido de compra
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;
  const userId = authResult.context!.user.id;
  const targetCompanyId = isMasterAdmin ? null : companyId;

  if (!targetCompanyId) {
    return errorResponse('Empresa não encontrada', 400);
  }

  try {
    const body = await request.json();
    const {
      supplierId,
      projectId,
      dataEntrega,
      condicoesPagto,
      observacoes,
      itens,
    } = body;

    // Validar dados obrigatórios
    if (!supplierId) {
      return errorResponse('Fornecedor é obrigatório', 400);
    }

    if (!itens || itens.length === 0) {
      return errorResponse('Pelo menos um item é obrigatório', 400);
    }

    // Gerar número do pedido
    const lastOrder = await db.purchase_orders.findFirst({
      where: { companyId: targetCompanyId },
      orderBy: { createdAt: 'desc' },
      select: { numero: true },
    });

    const lastNumber = lastOrder?.numero
      ? parseInt(lastOrder.numero.replace('PC-', '')) || 0
      : 0;
    const numero = `PC-${String(lastNumber + 1).padStart(6, '0')}`;

    // Calcular valor total
    const valorTotal = itens.reduce(
      (sum: number, item: { quantidade: number; precoUnitario: number }) =>
        sum + item.quantidade * item.precoUnitario,
      0
    );

    // Criar pedido
    const order = await db.purchase_orders.create({
      data: {
        companyId: targetCompanyId,
        supplierId,
        projectId: projectId || null,
        numero,
        dataEmissao: new Date(),
        dataEntrega: dataEntrega ? new Date(dataEntrega) : null,
        valorTotal,
        status: 'rascunho',
        condicoesPagto,
        observacoes,
        criadoPor: userId,
        itens: {
          create: itens.map((item: any, index: number) => ({
            materialId: item.materialId || null,
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade: item.quantidade,
            quantidadeRec: 0,
            precoUnitario: item.precoUnitario,
            valorTotal: item.quantidade * item.precoUnitario,
            ordem: index,
          })),
        },
      },
      include: {
        suppliers: true,
        projects: true,
        itens: true,
      },
    });

    return NextResponse.json({
      success: true,
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
    console.error('Erro ao criar pedido:', error);
    return errorResponse('Erro ao criar pedido', 500);
  }
}
