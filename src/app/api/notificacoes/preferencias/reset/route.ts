// =============================================================================
// ConstrutorPro - API de Reset de Preferências de Notificação
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/server/auth';
import { notificationPreferencesService } from '@/lib/notification-preferences';

// =============================================================================
// POST - Resetar Preferências para Padrão
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const { user } = authResult.context!;

    const preferences = await notificationPreferencesService.reset(user.id);

    return NextResponse.json({
      success: true,
      data: preferences,
      message: 'Preferências de notificação resetadas para os valores padrão',
    });
  } catch (error) {
    console.error('Erro ao resetar preferências de notificação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao resetar preferências de notificação' },
      { status: 500 }
    );
  }
}
