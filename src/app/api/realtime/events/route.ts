// =============================================================================
// ConstrutorPro - SSE Events Endpoint
// Endpoint para streaming de eventos Server-Sent Events
// =============================================================================

import { NextRequest } from 'next/server';
import { createSSEStream, SSE_CONFIG } from '@/lib/realtime';
import { getSession } from '@/server/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Obter parâmetros
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const userId = searchParams.get('userId') || session.id;
    const filtersParam = searchParams.get('filters');
    const lastEventId = request.headers.get('Last-Event-ID');

    if (!companyId) {
      return new Response('companyId is required', { status: 400 });
    }

    // Verificar se o usuário pertence à empresa
    if (session.companyId !== companyId && session.role !== 'master_admin') {
      return new Response('Forbidden', { status: 403 });
    }

    // Parse filters
    const filters = filtersParam ? filtersParam.split(',') as any[] : undefined;

    // Criar stream SSE
    const { connectionId, stream } = createSSEStream(companyId, {
      userId,
      filters,
      lastEventId: lastEventId || undefined,
    });

    // Retornar resposta SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Desabilitar buffering no nginx
        'X-Connection-Id': connectionId,
        'Retry': String(SSE_CONFIG.retryInterval),
      },
    });
  } catch (error) {
    console.error('SSE error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
