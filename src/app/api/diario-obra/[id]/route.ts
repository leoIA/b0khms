// =============================================================================
// ConstrutorPro - Daily Log by ID API Routes
// GET, PUT, DELETE /api/diario-obra/[id]
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiResponse,
  apiError,
  getValidId,
} from '@/lib/api';
import { requireOwnership, requireAuth } from '@/server/auth';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const activitySchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  location: z.string().optional().nullable(),
  workersCount: z.number().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
});

const updateDailyLogSchema = z.object({
  date: z.string().or(z.date()).transform((v) => new Date(v)).optional(),
  weather: z.enum(['sunny', 'cloudy', 'rainy', 'stormy']).optional(),
  temperatureMin: z.number().optional().nullable(),
  temperatureMax: z.number().optional().nullable(),
  workStartTime: z.string().optional().nullable(),
  workEndTime: z.string().optional().nullable(),
  workersCount: z.number().optional().nullable(),
  summary: z.string().min(1, 'Resumo é obrigatório').optional(),
  observations: z.string().optional().nullable(),
  incidents: z.string().optional().nullable(),
  visitors: z.string().optional().nullable(),
  activities: z.array(activitySchema).min(1, 'Pelo menos uma atividade é obrigatória').optional(),
});

// -----------------------------------------------------------------------------
// GET /api/diario-obra/[id] - Get Daily Log by ID
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const validId = getValidId({ id });

    if (!validId) {
      return apiError('ID inválido.', { status: 400 });
    }

    const authResult = await requireOwnership('dailyLog', validId);

    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status });
    }

    const dailyLog = await db.daily_logs.findUnique({
      where: { id: validId },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            address: true,
            city: true,
            state: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        daily_log_activities: {
          orderBy: { createdAt: 'asc' },
        },
        daily_log_photos: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!dailyLog) {
      return apiError('Diário de obra não encontrado.', { status: 404 });
    }

    return apiResponse(dailyLog);
  } catch (error) {
    console.error('[API] Error fetching daily log:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// PUT /api/diario-obra/[id] - Update Daily Log
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const validId = getValidId({ id });

    if (!validId) {
      return apiError('ID inválido.', { status: 400 });
    }

    const authResult = await requireOwnership('dailyLog', validId);

    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status });
    }

    const body = await request.json();
    const parsed = updateDailyLogSchema.safeParse(body);

    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      parsed.error.issues.forEach((err) => {
        const path = err.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(err.message);
      });
      return apiError('Dados inválidos.', { status: 400, details });
    }

    const data = parsed.data;

    // Check if daily log exists
    const existingLog = await db.daily_logs.findUnique({
      where: { id: validId },
    });

    if (!existingLog) {
      return apiError('Diário de obra não encontrado.', { status: 404 });
    }

    // If date is being changed, check for duplicates
    if (data.date) {
      const normalizedDate = new Date(new Date(data.date).setHours(0, 0, 0, 0));
      const duplicateLog = await db.daily_logs.findFirst({
        where: {
          projectId: existingLog.projectId,
          date: normalizedDate,
          NOT: { id: validId },
        },
      });

      if (duplicateLog) {
        return apiError('Já existe um registro para esta data neste projeto.', { status: 400 });
      }
    }

    // Update daily log
    const dailyLog = await db.$transaction(async (tx) => {
      // Update activities if provided
      if (data.activities) {
        // Delete existing activities
        await tx.daily_log_activities.deleteMany({
          where: { dailyLogId: validId },
        });

        // Create new activities
        await tx.daily_log_activities.createMany({
          data: data.activities!.map((a) => ({
            dailyLogId: validId,
            description: a.description,
            location: a.location,
            workersCount: a.workersCount,
            startTime: a.startTime,
            endTime: a.endTime,
            observations: a.observations,
          })),
        });
      }

      // Update daily log
      return tx.daily_logs.update({
        where: { id: validId },
        data: {
          date: data.date ? new Date(new Date(data.date).setHours(0, 0, 0, 0)) : undefined,
          weather: data.weather,
          temperatureMin: data.temperatureMin,
          temperatureMax: data.temperatureMax,
          workStartTime: data.workStartTime,
          workEndTime: data.workEndTime,
          workersCount: data.workersCount,
          summary: data.summary,
          observations: data.observations,
          incidents: data.incidents,
          visitors: data.visitors,
        },
        include: {
          projects: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          daily_log_activities: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    return apiResponse(dailyLog, { message: 'Diário de obra atualizado com sucesso.' });
  } catch (error) {
    console.error('[API] Error updating daily log:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// DELETE /api/diario-obra/[id] - Delete Daily Log
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const validId = getValidId({ id });

    if (!validId) {
      return apiError('ID inválido.', { status: 400 });
    }

    const authResult = await requireOwnership('dailyLog', validId);

    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status });
    }

    // Check if daily log exists
    const existingLog = await db.daily_logs.findUnique({
      where: { id: validId },
    });

    if (!existingLog) {
      return apiError('Diário de obra não encontrado.', { status: 404 });
    }

    // Delete daily log (cascade will handle activities and photos)
    await db.daily_logs.delete({
      where: { id: validId },
    });

    return apiResponse(null, { message: 'Diário de obra excluído com sucesso.' });
  } catch (error) {
    console.error('[API] Error deleting daily log:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}
