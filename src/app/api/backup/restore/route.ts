// =============================================================================
// ConstrutorPro - API de Restore de Backup
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/server/auth';
import { backupService, type BackupData } from '@/lib/backup-service';
import { z } from 'zod';

// =============================================================================
// Validation Schemas
// =============================================================================

const restoreBackupSchema = z.object({
  backupData: z.object({
    metadata: z.object({
      version: z.string(),
      createdAt: z.string(),
      companyId: z.string(),
      companyName: z.string(),
      modules: z.array(z.string()),
      recordCounts: z.record(z.string(), z.number()),
      checksum: z.string(),
      encrypted: z.boolean(),
    }),
    data: z.record(z.string(), z.unknown()),
  }),
  overwrite: z.boolean().optional().default(false),
  validateOnly: z.boolean().optional().default(false),
});

// =============================================================================
// POST /api/backup/restore - Restore backup
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Only admins can restore backups
    const authResult = await requireRole('company_admin');
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const companyId = authResult.context?.companyId;
    const userId = authResult.context?.user.id;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Usuário não associado a uma empresa' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = restoreBackupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dados de backup inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await backupService.restoreBackup({
      companyId,
      userId: userId!,
      backupData: parsed.data.backupData as BackupData,
      overwrite: parsed.data.overwrite,
      validateOnly: parsed.data.validateOnly,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result,
        message: parsed.data.validateOnly
          ? 'Backup validado com sucesso'
          : `Restauração concluída: ${result.modulesRestored.length} módulos restaurados`,
      });
    } else {
      return NextResponse.json({
        success: false,
        data: result,
        error: 'Falha na restauração do backup',
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/backup/restore:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/backup/restore - Get restore info and requirements
// =============================================================================

export async function GET() {
  try {
    await requireAuth();

    return NextResponse.json({
      success: true,
      data: {
        requirements: {
          role: 'admin',
          description: 'Apenas administradores podem restaurar backups',
        },
        supportedVersions: ['1.0.0'],
        warnings: [
          'A restauração pode sobrescrever dados existentes',
          'Faça um backup antes de restaurar',
          'Valide o backup antes de aplicar',
        ],
        steps: [
          '1. Faça upload do arquivo de backup',
          '2. Valide o backup (validateOnly: true)',
          '3. Revise os módulos e contagens',
          '4. Confirme a restauração (overwrite: true/false)',
        ],
      },
    });
  } catch (error) {
    console.error('Error in GET /api/backup/restore:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
