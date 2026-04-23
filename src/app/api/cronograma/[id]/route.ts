// =============================================================================
// ConstrutorPro - Schedule [id] API Routes
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiResponse, apiError, notFoundError } from '@/lib/api';
import { requireAuth } from '@/server/auth';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const updateScheduleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().or(z.date()).transform((v) => (v ? new Date(v) : undefined)).optional(),
  endDate: z.string().or(z.date()).transform((v) => (v ? new Date(v) : undefined)).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']).optional(),
  progress: z.number().min(0).max(100).optional(),
});

// -----------------------------------------------------------------------------
// GET /api/cronograma/[id] - Get Schedule by ID
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

    const schedule = await db.schedules.findFirst({
      where,
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        schedule_tasks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!schedule) {
      return notFoundError('Cronograma não encontrado.');
    }

    return apiResponse(schedule);
  } catch (error) {
    console.error('[API] Error getting schedule:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// PUT /api/cronograma/[id] - Update Schedule
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
    const parsed = updateScheduleSchema.safeParse(body);

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

    const existingSchedule = await db.schedules.findFirst({ where });

    if (!existingSchedule) {
      return notFoundError('Cronograma não encontrado.');
    }

    const { startDate, endDate, ...restData } = parsed.data;

    // Validate dates if provided
    const finalStartDate = startDate ?? existingSchedule.startDate;
    const finalEndDate = endDate ?? existingSchedule.endDate;

    if (finalStartDate >= finalEndDate) {
      return apiError('A data de início deve ser anterior à data de término.', {
        status: 400,
      });
    }

    const schedule = await db.schedules.update({
      where: { id },
      data: {
        ...restData,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        schedule_tasks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return apiResponse(schedule, { message: 'Cronograma atualizado com sucesso.' });
  } catch (error) {
    console.error('[API] Error updating schedule:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// DELETE /api/cronograma/[id] - Delete Schedule
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

    const where: Record<string, unknown> = { id };
    if (!context!.isMasterAdmin) {
      where.companyId = context!.companyId;
    }

    const existingSchedule = await db.schedules.findFirst({ where });

    if (!existingSchedule) {
      return notFoundError('Cronograma não encontrado.');
    }

    await db.schedules.delete({
      where: { id },
    });

    return apiResponse({ id }, { message: 'Cronograma excluído com sucesso.' });
  } catch (error) {
    console.error('[API] Error deleting schedule:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}
