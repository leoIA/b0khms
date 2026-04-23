// =============================================================================
// ConstrutorPro - Single Session API
// Revoke a specific session
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/server/auth';
import { logger } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/usuarios/sessoes/[id]
 * Revoke a specific session
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success || !authResult.context) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Não autorizado' },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.context.user.id;
    const { id } = await params;

    // Get current session token to prevent self-revocation via this endpoint
    const currentSessionToken = request.cookies.get('next-auth.session-token')?.value ||
                                 request.cookies.get('__Secure-next-auth.session-token')?.value;

    // Find the session to revoke
    const session = await db.sessions.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Prevent revoking current session
    if (session.sessionToken === currentSessionToken) {
      return NextResponse.json(
        { success: false, error: 'Não é possível revogar a sessão atual. Use o logout para isso.' },
        { status: 400 }
      );
    }

    // Delete the session
    await db.sessions.delete({
      where: { id },
    });

    logger.info('Session revoked', { 
      userId, 
      sessionId: id,
      sessionIp: session.ipAddress,
    });
    
    // Audit log
    await auditLogger.log({
      action: 'session_revoked',
      category: 'authentication',
      severity: 'warning',
      userId,
      companyId: authResult.context.user.companyId ?? undefined,
      resourceType: 'session',
      resourceId: id,
      metadata: { sessionIp: session.ipAddress, sessionDevice: session.device },
    });

    return NextResponse.json({
      success: true,
      message: 'Sessão revogada com sucesso',
    });
  } catch (error) {
    logger.error('Failed to revoke session', error as Error);
    return NextResponse.json(
      { success: false, error: 'Erro ao revogar sessão' },
      { status: 500 }
    );
  }
}
