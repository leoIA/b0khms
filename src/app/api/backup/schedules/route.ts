// =============================================================================
// ConstrutorPro - Backup Schedules API
// API para gerenciamento de agendamentos de backup
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { backupScheduler, BackupScheduleConfig } from '@/lib/backup-scheduler';

// -----------------------------------------------------------------------------
// GET - List Backup Schedules
// -----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const isMasterAdmin = context?.isMasterAdmin ?? false;

  // Only master admins can manage backup schedules
  if (!isMasterAdmin) {
    return errorResponse('Acesso negado. Apenas administradores master podem gerenciar backups.', 403);
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId') || context!.companyId;

  if (!companyId) {
    return errorResponse('ID da empresa é obrigatório', 400);
  }

  try {
    const schedules = await backupScheduler.listSchedules(companyId);
    return successResponse(schedules);
  } catch (error) {
    console.error('Error listing backup schedules:', error);
    return errorResponse('Erro ao listar agendamentos de backup', 500);
  }
}

// -----------------------------------------------------------------------------
// POST - Create Backup Schedule
// -----------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const isMasterAdmin = context?.isMasterAdmin ?? false;

  if (!isMasterAdmin) {
    return errorResponse('Acesso negado. Apenas administradores master podem criar agendamentos.', 403);
  }

  try {
    const body = await request.json();
    const {
      companyId,
      name,
      description,
      frequency,
      modules,
      retentionDays,
      maxBackups,
      encryptBackups,
      compressBackups,
      scheduledTime,
      timezone,
      daysOfWeek,
      dayOfMonth,
      notifyOnSuccess,
      notifyOnFailure,
      notifyEmails,
      isActive,
    } = body;

    // Validate required fields
    if (!companyId || !name || !frequency || !modules?.length) {
      return errorResponse('Campos obrigatórios: companyId, name, frequency, modules', 400);
    }

    const config: BackupScheduleConfig = {
      companyId,
      name,
      description,
      frequency,
      modules,
      retentionDays: retentionDays || 30,
      maxBackups: maxBackups || 10,
      encryptBackups: encryptBackups ?? true,
      compressBackups: compressBackups ?? true,
      scheduledTime: scheduledTime || '02:00',
      timezone: timezone || 'America/Sao_Paulo',
      daysOfWeek,
      dayOfMonth,
      notifyOnSuccess: notifyOnSuccess ?? true,
      notifyOnFailure: notifyOnFailure ?? true,
      notifyEmails,
      isActive: isActive ?? true,
    };

    const result = await backupScheduler.createSchedule(config);

    return successResponse({
      id: result.id,
      nextRunAt: result.nextRunAt,
      message: 'Agendamento criado com sucesso',
    });
  } catch (error) {
    console.error('Error creating backup schedule:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao criar agendamento',
      500
    );
  }
}
