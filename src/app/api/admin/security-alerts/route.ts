// =============================================================================
// ConstrutorPro - Security Alerts API
// API para gerenciamento de alertas de segurança
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { securityMonitor } from '@/lib/security-monitor';

// -----------------------------------------------------------------------------
// GET - List Security Alerts
// -----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const isMasterAdmin = context?.isMasterAdmin ?? false;
  const { searchParams } = new URL(request.url);

  // Only master admins can see all alerts
  const companyId = isMasterAdmin 
    ? searchParams.get('companyId') || undefined 
    : context!.companyId;

  const userId = searchParams.get('userId') || undefined;
  const severity = searchParams.get('severity')?.split(',') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');

  const alerts = await securityMonitor.getActiveAlerts({
    companyId,
    userId,
    severity,
    limit,
  });

  const stats = await securityMonitor.getSecurityStats(companyId);

  return successResponse({
    alerts,
    stats,
  });
}

// -----------------------------------------------------------------------------
// POST - Acknowledge Alert
// -----------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const body = await request.json();
  const { alertId } = body;

  if (!alertId) {
    return errorResponse('ID do alerta é obrigatório', 400);
  }

  const success = securityMonitor.acknowledgeAlert(alertId, context!.user.id);

  if (!success) {
    return errorResponse('Alerta não encontrado', 404);
  }

  return successResponse({
    message: 'Alerta reconhecido com sucesso',
    alertId,
  });
}
