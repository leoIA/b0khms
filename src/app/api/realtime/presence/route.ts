// =============================================================================
// ConstrutorPro - Presence Endpoint
// Endpoint para gerenciar presença de usuários
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth';
import { presenceManager, eventBus } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

// GET - Obter usuários online
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId') || session.companyId;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    // Verificar permissão
    if (session.companyId !== companyId && session.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obter presenças
    const users = presenceManager.getCompanyPresence(companyId);
    const stats = presenceManager.getStats();

    return NextResponse.json({
      users,
      onlineCount: users.filter(u => u.status === 'online').length,
      stats: {
        totalOnline: stats.totalOnline,
        byStatus: stats.byStatus,
      },
    });
  } catch (error) {
    console.error('Presence GET error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST - Atualizar presença
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, userId, userName, userEmail, userAvatar, status, device, currentPage } = body;

    // Verificar permissão
    const targetCompanyId = companyId || session.companyId;
    const targetUserId = userId || session.id;

    if (!targetCompanyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    if (session.id !== targetUserId && session.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Se status apenas, atualizar status
    if (status && !userName) {
      presenceManager.updateStatus(targetUserId, status);
    } else {
      // Registrar presença completa
      presenceManager.setPresence(targetUserId, {
        userName: userName || session.name || 'Unknown',
        userEmail: userEmail || session.email || '',
        userAvatar: userAvatar || session.avatar,
        companyId: targetCompanyId,
        device,
        currentPage,
      });
    }

    // Emitir evento de presença
    eventBus.emit('activity:new', targetCompanyId, {
      type: 'presence',
      userId: targetUserId,
      status: status || 'online',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Presence POST error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE - Remover presença
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, userId } = body;

    const targetCompanyId = companyId || session.companyId;
    const targetUserId = userId || session.id;

    if (!targetCompanyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    if (session.id !== targetUserId && session.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Atualizar status para offline
    presenceManager.updateStatus(targetUserId, 'offline');

    // Emitir evento de presença
    eventBus.emit('activity:new', targetCompanyId, {
      type: 'presence',
      userId: targetUserId,
      status: 'offline',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Presence DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
