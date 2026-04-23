// =============================================================================
// ConstrutorPro - API de Preferências de Notificação
// Gerencia as preferências de notificação do usuário
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/server/auth';
import { notificationPreferencesService } from '@/lib/notification-preferences';

// =============================================================================
// GET - Buscar Preferências de Notificação
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const { user } = authResult.context!;

    // Buscar ou criar preferências
    const preferences = await notificationPreferencesService.getOrCreate(
      user.id,
      user.companyId!
    );

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Erro ao buscar preferências de notificação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar preferências de notificação' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Atualizar Preferências de Notificação
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const { user } = authResult.context!;
    const body = await request.json();

    // Validar campos permitidos
    const allowedFields = [
      'emailEnabled',
      'pushEnabled',
      'inAppEnabled',
      'smsEnabled',
      'frequency',
      'projectNotifications',
      'financialNotifications',
      'scheduleNotifications',
      'stockNotifications',
      'systemNotifications',
      'dailyLogNotifications',
      'digestTime',
      'digestTimezone',
      'digestDays',
      'quietHoursEnabled',
      'quietHoursStart',
      'quietHoursEnd',
    ];

    const updateData: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key];
      }
    }

    // Validar frequency
    if (updateData.frequency) {
      const validFrequencies = ['instant', 'hourly', 'daily', 'weekly'];
      if (!validFrequencies.includes(updateData.frequency as string)) {
        return NextResponse.json(
          { success: false, error: 'Frequência inválida' },
          { status: 400 }
        );
      }
    }

    // Validar digestDays (array de números 0-6)
    if (updateData.digestDays) {
      const days = updateData.digestDays as number[];
      if (!Array.isArray(days) || !days.every((d) => d >= 0 && d <= 6)) {
        return NextResponse.json(
          { success: false, error: 'Dias do resumo inválidos' },
          { status: 400 }
        );
      }
    }

    // Validar horários (formato HH:MM)
    const timeFields = ['digestTime', 'quietHoursStart', 'quietHoursEnd'];
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    for (const field of timeFields) {
      if (updateData[field] && !timeRegex.test(updateData[field] as string)) {
        return NextResponse.json(
          { success: false, error: `${field} deve estar no formato HH:MM` },
          { status: 400 }
        );
      }
    }

    // Atualizar preferências
    const preferences = await notificationPreferencesService.update(
      user.id,
      updateData
    );

    return NextResponse.json({
      success: true,
      data: preferences,
      message: 'Preferências de notificação atualizadas com sucesso',
    });
  } catch (error) {
    console.error('Erro ao atualizar preferências de notificação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar preferências de notificação' },
      { status: 500 }
    );
  }
}
