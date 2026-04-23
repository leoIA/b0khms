// =============================================================================
// ConstrutorPro - Schedule Tasks API Routes
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiResponse, apiError, notFoundError } from '@/lib/api';
import { requireAuth } from '@/server/auth';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const createTaskSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().nullable(),
  startDate: z.string().or(z.date()).transform((v) => new Date(v)),
  endDate: z.string().or(z.date()).transform((v) => new Date(v)),
  responsible: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']).default('pending'),
  progress: z.number().min(0).max(100).default(0),
  parentId: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().or(z.date()).transform((v) => (v ? new Date(v) : undefined)).optional(),
  endDate: z.string().or(z.date()).transform((v) => (v ? new Date(v) : undefined)).optional(),
  responsible: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']).optional(),
  progress: z.number().min(0).max(100).optional(),
  parentId: z.string().optional().nullable(),
});

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

async function updateScheduleProgress(scheduleId: string) {
  const tasks = await db.schedule_tasks.findMany({
    where: { scheduleId, parentId: null },
  });

  if (tasks.length === 0) return;

  const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
  const avgProgress = Math.round(totalProgress / tasks.length);

  await db.schedules.update({
    where: { id: scheduleId },
    data: { progress: avgProgress },
  });
}

// -----------------------------------------------------------------------------
// GET /api/cronograma/[id]/tarefas - List Tasks
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status! });
    }

    const { context } = authResult;
    const { id } = await params;

    const where: Record<string, unknown> = { id };
    if (!context!.isMasterAdmin) {
      where.companyId = context!.companyId;
    }

    const schedule = await db.schedules.findFirst({ where });

    if (!schedule) {
      return notFoundError('Cronograma não encontrado.');
    }

    const tasks = await db.schedule_tasks.findMany({
      where: { scheduleId: id },
      orderBy: { order: 'asc' },
    });

    return apiResponse(tasks);
  } catch (error) {
    console.error('[API] Error listing schedule_tasks:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// POST /api/cronograma/[id]/tarefas - Create Task
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status! });
    }

    const { context } = authResult;
    const { id } = await params;
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      parsed.error.issues.forEach((err) => {
        const path = err.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(err.message);
      });
      return apiError('Dados inválidos.', { status: 400, details });
    }

    const where: Record<string, unknown> = { id };
    if (!context!.isMasterAdmin) {
      where.companyId = context!.companyId;
    }

    const schedule = await db.schedules.findFirst({ where });

    if (!schedule) {
      return notFoundError('Cronograma não encontrado.');
    }

    const { name, description, startDate, endDate, responsible, status, progress, parentId } =
      parsed.data;

    // Validate dates
    if (startDate >= endDate) {
      return apiError('A data de início deve ser anterior à data de término.', {
        status: 400,
      });
    }

    // Verify parent task if provided
    if (parentId) {
      const parentTask = await db.schedule_tasks.findFirst({
        where: {
          id: parentId,
          scheduleId: id,
        },
      });

      if (!parentTask) {
        return apiError('Tarefa pai não encontrada.', { status: 404 });
      }
    }

    // Get max order
    const maxOrder = await db.schedule_tasks.aggregate({
      where: { scheduleId: id },
      _max: { order: true },
    });

    const task = await db.schedule_tasks.create({
      data: {
        scheduleId: id,
        name,
        description,
        startDate,
        endDate,
        duration: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        responsible,
        status,
        progress,
        parentId: parentId || null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    // Update schedule progress
    await updateScheduleProgress(id);

    return apiResponse(task, { message: 'Tarefa criada com sucesso.' });
  } catch (error) {
    console.error('[API] Error creating task:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// PUT /api/cronograma/[id]/tarefas - Update Task
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status! });
    }

    const { context } = authResult;
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      parsed.error.issues.forEach((err) => {
        const path = err.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(err.message);
      });
      return apiError('Dados inválidos.', { status: 400, details });
    }

    const where: Record<string, unknown> = { id };
    if (!context!.isMasterAdmin) {
      where.companyId = context!.companyId;
    }

    const schedule = await db.schedules.findFirst({ where });

    if (!schedule) {
      return notFoundError('Cronograma não encontrado.');
    }

    const { id: taskId, startDate, endDate, ...restData } = parsed.data;

    const existingTask = await db.schedule_tasks.findFirst({
      where: {
        id: taskId,
        scheduleId: id,
      },
    });

    if (!existingTask) {
      return notFoundError('Tarefa não encontrada.');
    }

    // Validate dates if provided
    const finalStartDate = startDate ?? existingTask.startDate;
    const finalEndDate = endDate ?? existingTask.endDate;

    if (finalStartDate >= finalEndDate) {
      return apiError('A data de início deve ser anterior à data de término.', {
        status: 400,
      });
    }

    const duration = Math.ceil(
      (finalEndDate.getTime() - finalStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const task = await db.schedule_tasks.update({
      where: { id: taskId },
      data: {
        ...restData,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        duration,
      },
    });

    // Update schedule progress
    await updateScheduleProgress(id);

    return apiResponse(task, { message: 'Tarefa atualizada com sucesso.' });
  } catch (error) {
    console.error('[API] Error updating task:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// DELETE /api/cronograma/[id]/tarefas - Delete Task
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status! });
    }

    const { context } = authResult;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return apiError('ID da tarefa é obrigatório.', { status: 400 });
    }

    const where: Record<string, unknown> = { id };
    if (!context!.isMasterAdmin) {
      where.companyId = context!.companyId;
    }

    const schedule = await db.schedules.findFirst({ where });

    if (!schedule) {
      return notFoundError('Cronograma não encontrado.');
    }

    const existingTask = await db.schedule_tasks.findFirst({
      where: {
        id: taskId,
        scheduleId: id,
      },
    });

    if (!existingTask) {
      return notFoundError('Tarefa não encontrada.');
    }

    // Delete task and its children (cascade)
    await db.schedule_tasks.delete({
      where: { id: taskId },
    });

    // Update schedule progress
    await updateScheduleProgress(id);

    return apiResponse({ id: taskId }, { message: 'Tarefa excluída com sucesso.' });
  } catch (error) {
    console.error('[API] Error deleting task:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}
