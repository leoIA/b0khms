// =============================================================================
// ConstrutorPro - Backup Detail API
// API para detalhes, download e exclusão de backup específico
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { backupScheduler } from '@/lib/backup-scheduler';
import { db } from '@/lib/db';

// -----------------------------------------------------------------------------
// GET - Get Backup Details or Download
// -----------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const isMasterAdmin = context?.isMasterAdmin ?? false;

  if (!isMasterAdmin) {
    return errorResponse('Acesso negado', 403);
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const download = searchParams.get('download') === 'true';

  try {
    // Download backup
    if (download) {
      const result = await backupScheduler.downloadBackup(id);
      
      if (!result) {
        return errorResponse('Backup não encontrado ou arquivo indisponível', 404);
      }

      return new Response(new Uint8Array(result.data), {
        headers: {
          'Content-Type': result.mimeType,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
          'Content-Length': result.data.length.toString(),
        },
      });
    }

    // Get details
    const details = await backupScheduler.getBackupDetails(id);
    
    if (!details) {
      return errorResponse('Backup não encontrado', 404);
    }

    return successResponse(details);
  } catch (error) {
    console.error('Error getting backup details:', error);
    return errorResponse('Erro ao buscar detalhes do backup', 500);
  }
}

// -----------------------------------------------------------------------------
// DELETE - Delete Backup
// -----------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const isMasterAdmin = context?.isMasterAdmin ?? false;

  if (!isMasterAdmin) {
    return errorResponse('Acesso negado', 403);
  }

  const { id } = await params;

  try {
    // Get backup details first to delete file
    const backup = await db.backup_history.findUnique({
      where: { id },
    });

    if (!backup) {
      return errorResponse('Backup não encontrado', 404);
    }

    // Delete from database (file will be cleaned up by scheduler)
    await db.backup_history.delete({
      where: { id },
    });

    return successResponse({ message: 'Backup removido com sucesso' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    return errorResponse('Erro ao remover backup', 500);
  }
}
