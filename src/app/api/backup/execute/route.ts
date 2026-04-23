// =============================================================================
// ConstrutorPro - Execute Backup API
// API para execução manual de backup
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { backupScheduler } from '@/lib/backup-scheduler';
import { BackupModule } from '@/lib/backup-service';

// -----------------------------------------------------------------------------
// POST - Execute Manual Backup
// -----------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const isMasterAdmin = context?.isMasterAdmin ?? false;

  // Only master admins and company admins can execute backups
  const isAdmin = isMasterAdmin || context?.user.role === 'company_admin' || context?.isCompanyAdmin;
  if (!isAdmin) {
    return errorResponse('Acesso negado. Apenas administradores podem executar backups.', 403);
  }

  try {
    const body = await request.json();
    const { modules, encrypt, compress } = body;

    // Default modules if not specified
    const backupModules: BackupModule[] = modules || [
      'projects',
      'clients',
      'suppliers',
      'materials',
      'compositions',
      'budgets',
      'transactions',
    ];

    if (!context?.companyId) {
      return errorResponse('Empresa não identificada', 400);
    }

    const result = await backupScheduler.executeManualBackup(
      context.companyId,
      context.user.id,
      backupModules,
      {
        encrypt: encrypt ?? true,
        compress: compress ?? true,
      }
    );

    if (result.success) {
      return successResponse({
        message: 'Backup executado com sucesso',
        backup: result,
      });
    } else {
      return errorResponse(result.error || 'Erro ao executar backup', 500);
    }
  } catch (error) {
    console.error('Error executing backup:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao executar backup',
      500
    );
  }
}
