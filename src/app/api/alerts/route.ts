// =============================================================================
// ConstrutorPro - Alerts API
// Sistema de notificações/alertas com paginação e filtros
// =============================================================================

import { NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// -----------------------------------------------------------------------------
// GET - List Alerts with pagination and filters
// -----------------------------------------------------------------------------
export async function GET(request: Request) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;

  try {
    const { searchParams } = new URL(request.url);
    const isReadParam = searchParams.get('isRead');
    const typeParam = searchParams.get('type');
    const searchParam = searchParams.get('search');
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    // Pagination
    const page = parseInt(pageParam || '1', 10);
    const limit = Math.min(parseInt(limitParam || '20', 10), 100);
    const skip = (page - 1) * limit;

    // Build filters
    const where: Prisma.alertsWhereInput = {};

    // Company filter (master admin can see all)
    if (!isMasterAdmin) {
      where.companyId = companyId;
    }

    // isRead filter
    if (isReadParam === 'true') {
      where.isRead = true;
    } else if (isReadParam === 'false') {
      where.isRead = false;
    }

    // Type filter
    if (typeParam && ['info', 'success', 'warning', 'error'].includes(typeParam)) {
      where.type = typeParam;
    }

    // Search filter (title or message)
    if (searchParam && searchParam.trim()) {
      where.OR = [
        { title: { contains: searchParam.trim(), mode: 'insensitive' } },
        { message: { contains: searchParam.trim(), mode: 'insensitive' } },
      ];
    }

    // Date range filter
    if (dateFromParam || dateToParam) {
      where.createdAt = {};
      if (dateFromParam) {
        const fromDate = new Date(dateFromParam);
        if (!isNaN(fromDate.getTime())) {
          where.createdAt.gte = fromDate;
        }
      }
      if (dateToParam) {
        const toDate = new Date(dateToParam);
        if (!isNaN(toDate.getTime())) {
          // Set to end of day
          toDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = toDate;
        }
      }
    }

    // Get total count for pagination
    const total = await db.alerts.count({ where });

    // Get alerts with pagination
    const alerts = await db.alerts.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        entityType: true,
        entityId: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    return NextResponse.json({
      data: alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao carregar alertas:', error);
    return errorResponse('Erro ao carregar alertas', 500);
  }
}

// -----------------------------------------------------------------------------
// PUT - Mark Alert(s) as Read
// -----------------------------------------------------------------------------
export async function PUT(request: Request) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;

  try {
    const body = await request.json();
    const { id, markAllAsRead, ids } = body;

    // Mark all as read
    if (markAllAsRead) {
      const where: Prisma.alertsWhereInput = { isRead: false };
      if (!isMasterAdmin) {
        where.companyId = companyId;
      }

      await db.alerts.updateMany({
        where,
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });

      return successResponse(null, 'Todos os alertas foram marcados como lidos');
    }

    // Mark multiple as read
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const where: Prisma.alertsWhereInput = {
        id: { in: ids },
        isRead: false,
      };
      if (!isMasterAdmin) {
        where.companyId = companyId;
      }

      await db.alerts.updateMany({
        where,
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });

      return successResponse(null, `${ids.length} alerta(s) marcado(s) como lido(s)`);
    }

    // Mark single alert as read
    if (!id) {
      return errorResponse('ID do alerta é obrigatório', 400);
    }

    const alert = await db.alerts.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!alert) {
      return errorResponse('Alerta não encontrado', 404);
    }

    if (!isMasterAdmin && alert.companyId !== companyId) {
      return errorResponse('Alerta não encontrado', 404);
    }

    await db.alerts.update({
      where: { id },
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
    });

    return successResponse(null, 'Alerta marcado como lido');
  } catch (error) {
    console.error('Erro ao atualizar alerta:', error);
    return errorResponse('Erro ao atualizar alerta', 500);
  }
}

// -----------------------------------------------------------------------------
// POST - Create Alert (for system use)
// -----------------------------------------------------------------------------
export async function POST(request: Request) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;

  try {
    const body = await request.json();
    const { type, title, message, entityType, entityId } = body;

    if (!type || !title || !message) {
      return errorResponse('Tipo, título e mensagem são obrigatórios', 400);
    }

    const alert = await db.alerts.create({
      data: {
        companyId,
        type,
        title,
        message,
        entityType,
        entityId,
        isRead: false,
      },
    });

    return successResponse(alert, 'Alerta criado com sucesso');
  } catch (error) {
    console.error('Erro ao criar alerta:', error);
    return errorResponse('Erro ao criar alerta', 500);
  }
}
