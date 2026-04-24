// =============================================================================
// ConstrutorPro - API para Marcar Todas Notificações como Lidas
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/server/auth';
import { db } from '@/lib/db';

// =============================================================================
// POST - Marcar Todas Notificações como Lidas
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const { user } = authResult.context!;

    const result = await db.alerts.updateMany({
      where: {
        companyId: user.companyId ?? undefined,
        isRead: false,
      },
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} notificação(ões) marcada(s) como lida(s)`,
      count: result.count,
    });
  } catch (error) {
    console.error('Erro ao marcar todas notificações como lidas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao marcar todas notificações como lidas' },
      { status: 500 }
    );
  }
}
