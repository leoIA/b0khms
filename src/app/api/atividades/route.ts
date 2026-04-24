// =============================================================================
// ConstrutorPro - Activities API Routes
// GET /api/atividades
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiResponse,
  apiError,
  parseQueryParams,
  calculatePagination,
  createPaginatedResponse,
} from '@/lib/api';
import { requireAuth } from '@/server/auth';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schema
// -----------------------------------------------------------------------------

const listActivitiesSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  userId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
});

// -----------------------------------------------------------------------------
// GET /api/atividades - List Activities
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return apiError(authResult.error!, { status: authResult.status! });
    }

    const { context } = authResult;

    const parsed = parseQueryParams(request, listActivitiesSchema);
    if (!parsed.success) {
      return apiError('Parâmetros inválidos.', { status: 400 });
    }

    const { page, limit, userId, entityType, entityId, action } = parsed.data;

    const { skip, limit: take, page: validPage } = calculatePagination(page, limit);
    const validLimit = take;

    const where: Record<string, unknown> = {};

    // Company filter (master admin sees all)
    if (!context!.isMasterAdmin) {
      where.companyId = context!.companyId;
    }

    // Filter by user
    if (userId) {
      // Only allow user to see their own activities (unless admin)
      if (userId !== context!.user.id && !context!.isCompanyAdmin && !context!.isMasterAdmin) {
        return apiError('Acesso negado.', { status: 403 });
      }
      where.userId = userId;
    }

    // Filter by entity type
    if (entityType) {
      where.entityType = entityType;
    }

    // Filter by entity ID
    if (entityId) {
      where.entityId = entityId;
    }

    // Filter by action
    if (action) {
      where.action = action;
    }

    const [activities, total] = await Promise.all([
      db.activities.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      }),
      db.activities.count({ where }),
    ]);

    return apiResponse(
      createPaginatedResponse(activities, total, validPage, validLimit)
    );
  } catch (error) {
    console.error('[API] Error listing activities:', error);
    return apiError('Erro interno do servidor.', { status: 500 });
  }
}
