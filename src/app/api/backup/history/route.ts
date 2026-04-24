// =============================================================================
// ConstrutorPro - Backup History API
// API para visualização de histórico de backups
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { backupScheduler } from '@/lib/backup-scheduler';

// -----------------------------------------------------------------------------
// GET - List Backup History
// -----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const isMasterAdmin = context?.isMasterAdmin ?? false;

  // Only master admins can view backup history
  if (!isMasterAdmin) {
    return errorResponse('Acesso negado. Apenas administradores master podem visualizar backups.', 403);
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId') || context!.companyId;
  const status = searchParams.get('status') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!companyId) {
    return errorResponse('ID da empresa é obrigatório', 400);
  }

  try {
    const result = await backupScheduler.listBackupHistory({
      companyId,
      status,
      limit,
      offset,
    });

    return successResponse(result);
  } catch (error) {
    console.error('Error listing backup history:', error);
    return errorResponse('Erro ao listar histórico de backups', 500);
  }
}
