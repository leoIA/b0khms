// =============================================================================
// ConstrutorPro - Schedule API Routes
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

const createScheduleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Projeto é obrigatório'),
  startDate: z.string().or(z.date()).transform((v) => new Date(v)),
  endDate: z.string().or(z.date()).transform((v) => new Date(v)),
});

const listScheduleSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  projectId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// -----------------------------------------------------------------------------
// GET /api/cronograma - List Schedules
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status! });
    }

    const { context } = authResult;

    const parsed = parseQueryParams(request, listScheduleSchema);
    if (!parsed.success) {
      return apiError('Parâmetros inválidos.', { status: 400 });
    }

    const {
      page,
      limit,
      search,
      status,
      projectId,
      sortBy,
      sortOrder,
    } = parsed.data;

    const { skip, limit: take, page: validPage } = calculatePagination(page, limit);
    const validLimit = take;

    const where: Record<string, unknown> = {};

    // Company filter (master admin sees all)
    if (!context!.isMasterAdmin) {
      where.companyId = context!.companyId;
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const searchCondition = buildSearchCondition(['name', 'description'], search);
    if (searchCondition) {
      where.OR = searchCondition.OR;
    }

    const orderBy = buildSortCondition(sortBy, sortOrder);

    const [schedules, total] = await Promise.all([
      db.schedules.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          projects: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      }),
      db.schedules.count({ where }),
    ]);

    return apiResponse(
      createPaginatedResponse(schedules, total, validPage, validLimit)
    );
  } catch (error) {
    console.error('[API] Error listing schedules:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// POST /api/cronograma - Create Schedule
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status! });
    }

    const { context } = authResult;

    const body = await request.json();
    const parsed = createScheduleSchema.safeParse(body);

    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      parsed.error.issues.forEach((err) => {
        const path = err.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(err.message);
      });
      return apiError('Dados inválidos.', { status: 400, details });
    }

    const { name, description, projectId, startDate, endDate } = parsed.data;

    // Verify project belongs to company (skip for master admin - they can create for any project)
    if (!context!.isMasterAdmin) {
      const project = await db.projects.findFirst({
        where: {
          id: projectId,
          companyId: context!.companyId,
        },
      });

      if (!project) {
        return apiError('Projeto não encontrado.', { status: 404 });
      }
    }

    if (startDate >= endDate) {
      return apiError('A data de início deve ser anterior à data de término.', {
        status: 400,
      });
    }

    // Get company ID from project for master admin, or use user's company
    let companyId = context!.companyId;
    if (context!.isMasterAdmin) {
      const project = await db.projects.findUnique({
        where: { id: projectId },
        select: { companyId: true },
      });
      if (!project) {
        return apiError('Projeto não encontrado.', { status: 404 });
      }
      companyId = project.companyId;
    }

    const schedule = await db.schedules.create({
      data: {
        companyId,
        projectId,
        name,
        description,
        startDate,
        endDate,
        status: 'pending',
        progress: 0,
      },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return apiResponse(schedule, { message: 'Cronograma criado com sucesso.' });
  } catch (error) {
    console.error('[API] Error creating schedule:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}
