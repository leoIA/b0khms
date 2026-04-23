// =============================================================================
// ConstrutorPro - Audit Logs API
// API para visualização de logs de auditoria (admin only)
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { auditLogger, AuditAction, AuditCategory, AuditSeverity, AuditStatus } from '@/lib/audit-logger';

// -----------------------------------------------------------------------------
// GET - List Audit Logs
// -----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const isMasterAdmin = context?.isMasterAdmin ?? false;

  // Apenas master_admin pode ver todos os logs
  // Outros usuários podem ver logs da própria empresa
  const { searchParams } = new URL(request.url);

  // Parse filters
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const companyId = isMasterAdmin
    ? searchParams.get('companyId') || undefined
    : context!.companyId;

  const userId = searchParams.get('userId') || undefined;
  const resourceType = searchParams.get('resourceType') || undefined;
  const resourceId = searchParams.get('resourceId') || undefined;
  const search = searchParams.get('search') || undefined;

  // Parse array filters
  const action = searchParams.get('action')?.split(',') as AuditAction[] | undefined;
  const category = searchParams.get('category')?.split(',') as AuditCategory[] | undefined;
  const severity = searchParams.get('severity')?.split(',') as AuditSeverity[] | undefined;
  const status = searchParams.get('status')?.split(',') as AuditStatus[] | undefined;

  // Parse date filters
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (searchParams.get('startDate')) {
    startDate = new Date(searchParams.get('startDate')!);
  }
  if (searchParams.get('endDate')) {
    endDate = new Date(searchParams.get('endDate')!);
  }

  // Stats only
  if (searchParams.get('stats') === 'true') {
    const stats = await auditLogger.getStats({
      companyId,
      startDate,
      endDate,
    });
    return successResponse(stats);
  }

  // Get logs
  const result = await auditLogger.getLogs({
    companyId,
    userId,
    action,
    category,
    severity,
    status,
    resourceType,
    resourceId,
    startDate,
    endDate,
    search,
    page,
    limit,
  });

  return successResponse({
    logs: result.logs,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
}

// -----------------------------------------------------------------------------
// DELETE - Cleanup Old Logs (Master Admin only)
// -----------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  // Check for master admin role
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const isMasterAdmin = authResult.context?.isMasterAdmin ?? false;

  if (!isMasterAdmin) {
    return errorResponse('Acesso negado. Apenas administradores master podem executar esta ação.', 403);
  }

  const { searchParams } = new URL(request.url);
  const retentionDays = parseInt(searchParams.get('retentionDays') || '90');

  if (retentionDays < 30) {
    return errorResponse('Período de retenção deve ser de pelo menos 30 dias', 400);
  }

  const deletedCount = await auditLogger.cleanupOldLogs(retentionDays);

  return successResponse({
    message: `${deletedCount} logs antigos foram removidos`,
    deletedCount,
  });
}
