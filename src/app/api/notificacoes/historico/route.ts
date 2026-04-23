// =============================================================================
// ConstrutorPro - API de Histórico de Notificações
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/server/auth';
import { notificationHistoryService } from '@/lib/notification-preferences';

// =============================================================================
// GET - Buscar Histórico de Notificações
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const { user } = authResult.context!;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const result = await notificationHistoryService.getByUserId(user.id, {
      limit,
      offset,
      unreadOnly,
    });

    // Contar não lidas
    const unreadCount = await notificationHistoryService.countUnread(user.id);

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      unreadCount,
    });
  } catch (error) {
    console.error('Erro ao buscar histórico de notificações:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar histórico de notificações' },
      { status: 500 }
    );
  }
}
