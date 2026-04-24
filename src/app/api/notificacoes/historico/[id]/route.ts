// =============================================================================
// ConstrutorPro - API de Notificação Individual
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse, notFoundResponse } from '@/server/auth';
import { db } from '@/lib/db';

// =============================================================================
// GET - Buscar Notificação por ID
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const { user } = authResult.context!;
    const { id } = await params;

    const notification = await db.alerts.findFirst({
      where: {
        id,
        companyId: user.companyId ?? undefined,
      },
    });

    if (!notification) {
      return notFoundResponse('Notificação não encontrada');
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Erro ao buscar notificação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar notificação' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Marcar Notificação como Lida
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const { user } = authResult.context!;
    const { id } = await params;

    // Verificar se a notificação pertence à empresa do usuário
    const notification = await db.alerts.findFirst({
      where: {
        id,
        companyId: user.companyId ?? undefined,
      },
    });

    if (!notification) {
      return notFoundResponse('Notificação não encontrada');
    }

    // Marcar como lida
    await db.alerts.update({
      where: { id },
      data: { isRead: true, updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'Notificação marcada como lida',
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao marcar notificação como lida' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Excluir Notificação
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const { user } = authResult.context!;
    const { id } = await params;

    // Verificar se a notificação pertence à empresa do usuário
    const notification = await db.alerts.findFirst({
      where: {
        id,
        companyId: user.companyId ?? undefined,
      },
    });

    if (!notification) {
      return notFoundResponse('Notificação não encontrada');
    }

    // Excluir notificação
    await db.alerts.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Notificação excluída com sucesso',
    });
  } catch (error) {
    console.error('Erro ao excluir notificação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir notificação' },
      { status: 500 }
    );
  }
}
