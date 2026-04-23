// =============================================================================
// ConstrutorPro - Restore Backup API
// API para restauração de backups
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { backupScheduler } from '@/lib/backup-scheduler';
import { BackupModule } from '@/lib/backup-service';

// -----------------------------------------------------------------------------
// POST - Restore Backup
// -----------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const isMasterAdmin = context?.isMasterAdmin ?? false;

  // Only master admins can restore backups
  if (!isMasterAdmin) {
    return errorResponse('Acesso negado. Apenas administradores master podem restaurar backups.', 403);
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { modules, overwrite } = body;

    const result = await backupScheduler.restoreBackup(
      id,
      context!.user.id,
      {
        modules: modules as BackupModule[] | undefined,
        overwrite: overwrite ?? false,
      }
    );

    if (result.success) {
      return successResponse({
        message: 'Backup restaurado com sucesso',
        ...result,
      });
    } else {
      return errorResponse(
        result.errors.length > 0 ? result.errors.join('; ') : 'Erro ao restaurar backup',
        500
      );
    }
  } catch (error) {
    console.error('Error restoring backup:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao restaurar backup',
      500
    );
  }
}
