// =============================================================================
// ConstrutorPro - Daily Log API Routes
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiResponse,
  apiError,
  parseQueryParams,
  calculatePagination,
  createPaginatedResponse,
  buildSearchCondition,
  buildSortCondition,
} from '@/lib/api';
import { requireAuth } from '@/server/auth';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const activitySchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  location: z.string().optional().nullable(),
  workersCount: z.number().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
});

const createDailyLogSchema = z.object({
  projectId: z.string().min(1, 'Projeto é obrigatório'),
  date: z.string().or(z.date()).transform((v) => new Date(v)),
  weather: z.enum(['sunny', 'cloudy', 'rainy', 'stormy']).default('sunny'),
  temperatureMin: z.number().optional().nullable(),
  temperatureMax: z.number().optional().nullable(),
  workStartTime: z.string().optional().nullable(),
  workEndTime: z.string().optional().nullable(),
  workersCount: z.number().optional().nullable(),
  summary: z.string().min(1, 'Resumo é obrigatório'),
  observations: z.string().optional().nullable(),
  incidents: z.string().optional().nullable(),
  visitors: z.string().optional().nullable(),
  activities: z.array(activitySchema).min(1, 'Pelo menos uma atividade é obrigatória'),
});

const listDailyLogSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  projectId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// -----------------------------------------------------------------------------
// GET /api/diario-obra - List Daily Logs
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status! });
    }

    const { context } = authResult;

    const parsed = parseQueryParams(request, listDailyLogSchema);
    if (!parsed.success) {
      return apiError('Parâmetros inválidos.', { status: 400 });
    }

    const { page, limit, search, projectId, sortBy, sortOrder } = parsed.data;

    const { skip, limit: take, page: validPage } = calculatePagination(page, limit);
    const validLimit = take;

    const where: Record<string, unknown> = {};

    // Company filter (master admin sees all)
    if (!context!.isMasterAdmin) {
      where.companyId = context!.companyId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const searchCondition = buildSearchCondition(['summary', 'observations'], search);
    if (searchCondition) {
      where.OR = searchCondition.OR;
    }

    const orderBy = buildSortCondition(sortBy ?? 'date', sortOrder ?? 'desc');

    const [dailyLogs, total] = await Promise.all([
      db.daily_logs.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          projects: {
            select: {
              id: true,
              name: true,
            },
          },
          users: {
            select: {
              id: true,
              name: true,
            },
          },
          daily_log_activities: true,
        },
      }),
      db.daily_logs.count({ where }),
    ]);

    return apiResponse(
      createPaginatedResponse(dailyLogs, total, validPage, validLimit)
    );
  } catch (error) {
    console.error('[API] Error listing daily logs:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// POST /api/diario-obra - Create Daily Log
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status! });
    }

    const { context } = authResult;

    const body = await request.json();
    const parsed = createDailyLogSchema.safeParse(body);

    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      parsed.error.issues.forEach((err) => {
        const path = err.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(err.message);
      });
      return apiError('Dados inválidos.', { status: 400, details });
    }

    const {
      projectId,
      date,
      weather,
      temperatureMin,
      temperatureMax,
      workStartTime,
      workEndTime,
      workersCount,
      summary,
      observations,
      incidents,
      visitors,
      activities,
    } = parsed.data;

    // Verify project exists and get company ID
    const project = await db.projects.findUnique({
      where: { id: projectId },
      select: { companyId: true },
    });

    if (!project) {
      return apiError('Projeto não encontrado.', { status: 404 });
    }

    // Verify project belongs to company (skip for master admin)
    if (!context!.isMasterAdmin && project.companyId !== context!.companyId) {
      return apiError('Projeto não encontrado.', { status: 404 });
    }

    const companyId = project.companyId;
    const createdBy = context!.user.id;
    const normalizedDate = new Date(new Date(date).setHours(0, 0, 0, 0));

    // Use transaction to prevent race condition
    let dailyLog;
    try {
      dailyLog = await db.$transaction(async (tx) => {
        // Check inside transaction if there's already a log for this date and project
        const existingLog = await tx.daily_logs.findFirst({
          where: {
            projectId,
            date: normalizedDate,
          },
        });

        if (existingLog) {
          throw new Error('DUPLICATE');
        }

        return tx.daily_logs.create({
          data: {
            companyId,
            projectId,
            date: normalizedDate,
            weather,
            temperatureMin,
            temperatureMax,
            workStartTime,
            workEndTime,
            workersCount,
            summary,
            observations,
            incidents,
            visitors,
            createdBy,
            daily_log_activities: {
              create: activities.map((a) => ({
                description: a.description,
                location: a.location,
                workersCount: a.workersCount,
                startTime: a.startTime,
                endTime: a.endTime,
                observations: a.observations,
              })),
            },
          },
          include: {
            projects: {
              select: {
                id: true,
                name: true,
              },
            },
            users: {
              select: {
                id: true,
                name: true,
              },
            },
            daily_log_activities: true,
          },
        });
      });
    } catch (txError) {
      if (txError instanceof Error && txError.message === 'DUPLICATE') {
        return apiError('Já existe um registro para esta data neste projeto.', {
          status: 400,
        });
      }
      throw txError;
    }

    return apiResponse(dailyLog, { message: 'Diário de obra criado com sucesso.' });
  } catch (error) {
    console.error('[API] Error creating daily log:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}
