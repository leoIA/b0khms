// =============================================================================
// ConstrutorPro - User Sessions API
// Manage active sessions for security
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/server/auth';
import { logger } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';

/**
 * GET /api/usuarios/sessoes
 * List all active sessions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success || !authResult.context) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Não autorizado' },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.context.user.id;

    // Get current session token from cookie
    const currentSessionToken = request.cookies.get('next-auth.session-token')?.value ||
                                 request.cookies.get('__Secure-next-auth.session-token')?.value;

    // Get all active sessions for the user
    const sessions = await db.sessions.findMany({
      where: {
        userId,
        expires: {
          gte: new Date(), // Only active sessions
        },
      },
      orderBy: {
        lastActive: 'desc',
      },
      select: {
        id: true,
        sessionToken: true,
        expires: true,
        ipAddress: true,
        userAgent: true,
        device: true,
        browser: true,
        os: true,
        location: true,
        lastActive: true,
        createdAt: true,
      },
    });

    // Mark current session
    const currentSession = sessions.find(s => s.sessionToken === currentSessionToken);

    const sessionsWithCurrent = sessions.map((session) => ({
      ...session,
      isCurrent: session.sessionToken === currentSessionToken,
    }));

    return NextResponse.json({
      success: true,
      data: sessionsWithCurrent,
      meta: {
        total: sessions.length,
        currentSessionId: currentSession?.id || null,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch sessions', error as Error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar sessões' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/usuarios/sessoes
 * Revoke all sessions except the current one
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success || !authResult.context) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Não autorizado' },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.context.user.id;

    // Get current session token
    const currentSessionToken = request.cookies.get('next-auth.session-token')?.value ||
                                 request.cookies.get('__Secure-next-auth.session-token')?.value;

    // Delete all sessions except current
    const result = await db.sessions.deleteMany({
      where: {
        userId,
        sessionToken: {
          not: currentSessionToken || '',
        },
      },
    });

    logger.info('Sessions revoked', { 
      userId, 
      count: result.count 
    });
    
    // Audit log
    await auditLogger.log({
      action: 'session_revoked_all',
      category: 'authentication',
      severity: 'warning',
      userId,
      companyId: authResult.context.user.companyId ?? undefined,
      metadata: { revokedCount: result.count },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} sessões revogadas com sucesso`,
      data: { revokedCount: result.count },
    });
  } catch (error) {
    logger.error('Failed to revoke sessions', error as Error);
    return NextResponse.json(
      { success: false, error: 'Erro ao revogar sessões' },
      { status: 500 }
    );
  }
}
