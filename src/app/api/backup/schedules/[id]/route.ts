// =============================================================================
// ConstrutorPro - Backup Schedule Detail API
// API para gerenciamento de um agendamento específico
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { backupScheduler, BackupScheduleConfig } from '@/lib/backup-scheduler';

// -----------------------------------------------------------------------------
// GET - Get Backup Schedule Details
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

  try {
    const schedule = await backupScheduler.getSchedule(id);
    
    if (!schedule) {
      return errorResponse('Agendamento não encontrado', 404);
    }

    return successResponse(schedule);
  } catch (error) {
    console.error('Error getting backup schedule:', error);
    return errorResponse('Erro ao buscar agendamento', 500);
  }
}

// -----------------------------------------------------------------------------
// PUT - Update Backup Schedule
// -----------------------------------------------------------------------------
export async function PUT(
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
    const body = await request.json();
    
    const config: Partial<BackupScheduleConfig> = {};
    
    if (body.name) config.name = body.name;
    if (body.description !== undefined) config.description = body.description;
    if (body.frequency) config.frequency = body.frequency;
    if (body.modules) config.modules = body.modules;
    if (body.retentionDays) config.retentionDays = body.retentionDays;
    if (body.maxBackups) config.maxBackups = body.maxBackups;
    if (body.encryptBackups !== undefined) config.encryptBackups = body.encryptBackups;
    if (body.compressBackups !== undefined) config.compressBackups = body.compressBackups;
    if (body.scheduledTime) config.scheduledTime = body.scheduledTime;
    if (body.timezone) config.timezone = body.timezone;
    if (body.daysOfWeek) config.daysOfWeek = body.daysOfWeek;
    if (body.dayOfMonth) config.dayOfMonth = body.dayOfMonth;
    if (body.notifyOnSuccess !== undefined) config.notifyOnSuccess = body.notifyOnSuccess;
    if (body.notifyOnFailure !== undefined) config.notifyOnFailure = body.notifyOnFailure;
    if (body.notifyEmails) config.notifyEmails = body.notifyEmails;
    if (body.isActive !== undefined) config.isActive = body.isActive;

    await backupScheduler.updateSchedule(id, config);

    const updatedSchedule = await backupScheduler.getSchedule(id);

    return successResponse({
      message: 'Agendamento atualizado com sucesso',
      schedule: updatedSchedule,
    });
  } catch (error) {
    console.error('Error updating backup schedule:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao atualizar agendamento',
      500
    );
  }
}

// -----------------------------------------------------------------------------
// DELETE - Delete Backup Schedule
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
    await backupScheduler.deleteSchedule(id);
    return successResponse({ message: 'Agendamento removido com sucesso' });
  } catch (error) {
    console.error('Error deleting backup schedule:', error);
    return errorResponse('Erro ao remover agendamento', 500);
  }
}
