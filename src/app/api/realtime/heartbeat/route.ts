// =============================================================================
// ConstrutorPro - Heartbeat Endpoint
// Endpoint para manter conexão SSE viva
// =============================================================================

import { NextResponse } from 'next/server';
import { getSession } from '@/server/auth';
import { presenceManager } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Registrar heartbeat de presença
    presenceManager.heartbeat(session.id);

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
