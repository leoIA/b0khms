// =============================================================================
// ConstrutorPro - API de Estatísticas de Notificações
// Retorna estatísticas agregadas sobre notificações do usuário/empresa
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/server/auth';
import { db } from '@/lib/db';

// =============================================================================
// GET - Buscar Estatísticas de Notificações
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const { user } = authResult.context!;
    const companyId = user.companyId!;

    // Buscar todas as notificações da empresa
    const alerts = await db.alerts.findMany({
      where: { companyId },
      select: {
        type: true,
        isRead: true,
        createdAt: true,
      },
    });

    // Calcular estatísticas
    const total = alerts.length;
    const unread = alerts.filter((a) => !a.isRead).length;

    // Por tipo
    const byType = {
      info: alerts.filter((a) => a.type === 'info').length,
      success: alerts.filter((a) => a.type === 'success').length,
      warning: alerts.filter((a) => a.type === 'warning').length,
      error: alerts.filter((a) => a.type === 'error').length,
    };

    // Por categoria (baseado no entityType)
    const alertsByCategory = await db.alerts.findMany({
      where: { companyId },
      select: { entityType: true },
    });

    const byCategory = {
      project: alertsByCategory.filter((a) => a.entityType === 'project').length,
      financial: alertsByCategory.filter((a) => 
        a.entityType === 'budget' || a.entityType === 'transaction'
      ).length,
      schedule: alertsByCategory.filter((a) => 
        a.entityType === 'task' || a.entityType === 'schedule'
      ).length,
      stock: alertsByCategory.filter((a) => a.entityType === 'material').length,
      system: alertsByCategory.filter((a) => a.entityType === 'system' || !a.entityType).length,
      daily_log: alertsByCategory.filter((a) => a.entityType === 'daily_log').length,
    };

    // Calcular tendência (comparar última semana com semana anterior)
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const lastWeekAlerts = alerts.filter((a) => 
      a.createdAt >= oneWeekAgo && a.createdAt < now
    ).length;

    const previousWeekAlerts = alerts.filter((a) => 
      a.createdAt >= twoWeeksAgo && a.createdAt < oneWeekAgo
    ).length;

    let recentTrend = 0;
    if (previousWeekAlerts > 0) {
      recentTrend = Math.round(
        ((lastWeekAlerts - previousWeekAlerts) / previousWeekAlerts) * 100
      );
    } else if (lastWeekAlerts > 0) {
      recentTrend = 100; // Novas notificações onde não havia antes
    }

    return NextResponse.json({
      success: true,
      data: {
        total,
        unread,
        byType,
        byCategory,
        recentTrend,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de notificações:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar estatísticas de notificações' },
      { status: 500 }
    );
  }
}
