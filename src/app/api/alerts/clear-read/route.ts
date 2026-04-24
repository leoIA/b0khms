// =============================================================================
// ConstrutorPro - API para Limpar Notificações Lidas
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/server/auth';
import { db } from '@/lib/db';

// =============================================================================
// DELETE - Remover Todas as Notificações Lidas
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    const { user } = authResult.context!;
    const companyId = user.companyId!;

    // Remover todas as notificações lidas da empresa
    const result = await db.alerts.deleteMany({
      where: {
        companyId,
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} notificações removidas`,
      count: result.count,
    });
  } catch (error) {
    console.error('Erro ao limpar notificações:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao limpar notificações' },
      { status: 500 }
    );
  }
}
