// =============================================================================
// ConstrutorPro - WebSocket Info Endpoint
// Endpoint para obter informações de conexão WebSocket
// =============================================================================

import { NextResponse } from 'next/server';
import { getSession } from '@/server/auth';
import { WEBSOCKET_CONFIG, wsManager } from '@/lib/realtime/websocket';

export const dynamic = 'force-dynamic';

/**
 * GET /api/websocket/info
 * Retorna informações para conexão WebSocket
 */
export async function GET() {
  try {
    // Verificar autenticação
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Retornar informações de conexão
    return NextResponse.json({
      success: true,
      data: {
        // URL do WebSocket (pode ser diferente da URL HTTP)
        url: process.env.WEBSOCKET_URL || `ws://localhost:${WEBSOCKET_CONFIG.port}`,
        // Porta do WebSocket
        port: WEBSOCKET_CONFIG.port,
        // Status do servidor
        serverRunning: wsManager.isRunning(),
        // Estatísticas (apenas para admin)
        stats: session.role === 'master_admin' ? wsManager.getStats() : undefined,
        // Dados de autenticação para o cliente
        auth: {
          companyId: session.companyId,
          userId: session.id,
          userName: session.name,
          userEmail: session.email,
          userRole: session.role,
        },
        // Configurações
        config: {
          heartbeatInterval: WEBSOCKET_CONFIG.heartbeatInterval,
          pingInterval: WEBSOCKET_CONFIG.pingInterval,
        },
      },
    });
  } catch (error) {
    console.error('[WebSocket API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
