// =============================================================================
// ConstrutorPro - Projects API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSearchCondition } from '@/lib/api';
import { createProjectSchema, paginationSchema } from '@/validators/auth';
import { checkProjectDeadlines, checkOverdueProjects, runAllAlertChecks } from '@/lib/alerts';
import { emitProjectEvent, emitNotificationEvent } from '@/lib/realtime';

// -----------------------------------------------------------------------------
// Sort Field Validation
// -----------------------------------------------------------------------------

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'status', 'code', 'startDate', 'endDate'] as const;

function validateSortField(field: string | undefined): string {
  if (!field) return 'createdAt';
  return ALLOWED_SORT_FIELDS.includes(field as typeof ALLOWED_SORT_FIELDS[number])
    ? field
    : 'createdAt';
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const { searchParams } = new URL(request.url);
  
  // Handle alert checks
  const checkAlerts = searchParams.get('checkAlerts');
  if (checkAlerts === 'true') {
    try {
      const results = await runAllAlertChecks(context!.companyId!);
      return successResponse({
        message: 'Verificação de alertas concluída',
        alertsCreated: {
          estoqueBaixo: results.lowStock.length,
          pagamentosVencidos: results.overduePayments.length,
          prazosProximos: results.projectDeadlines.length,
          projetosAtrasados: results.overdueProjects.length,
        },
      });
    } catch (error) {
      console.error('Erro ao verificar alertas:', error);
      return errorResponse('Erro ao verificar alertas', 500);
    }
  }

  // Handle deadline check only
  const checkDeadlines = searchParams.get('checkDeadlines');
  if (checkDeadlines === 'true') {
    try {
      const nearDeadlines = await checkProjectDeadlines(context!.companyId!);
      const overdue = await checkOverdueProjects(context!.companyId!);
      return successResponse({
        nearDeadlines: nearDeadlines.length,
        overdue: overdue.length,
        totalAlertsCreated: nearDeadlines.length + overdue.length,
      });
    } catch (error) {
      console.error('Erro ao verificar prazos:', error);
      return errorResponse('Erro ao verificar prazos', 500);
    }
  }

  const queryResult = parseQueryParams(request, paginationSchema);
  
  if (!queryResult.success) {
    return errorResponse(queryResult.error, 400);
  }

  const { page, limit, search, sortBy, sortOrder } = queryResult.data;
  const { skip } = calculatePagination(page, limit);

  // Get status filter from query
  const status = searchParams.get('status') as 'planning' | 'active' | 'paused' | 'completed' | 'cancelled' | null;
  const clientId = searchParams.get('clientId');

  const where = {
    companyId: context!.companyId,
    ...(status ? { status } : {}),
    ...(clientId ? { clientId } : {}),
    ...buildSearchCondition(['name', 'code', 'description'], search),
  };

  const [projects, total] = await Promise.all([
    db.projects.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [validateSortField(sortBy)]: sortOrder || 'desc' },
      include: {
        clients: {
          select: { id: true, name: true },
        },
        _count: {
          select: { budgets: true, daily_logs: true },
        },
      },
    }),
    db.projects.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(projects, total, page, limit));
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, createProjectSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;

  // Validate client belongs to company
  if (data.clientId) {
    const client = await db.clients.findFirst({
      where: { id: data.clientId, companyId: context!.companyId },
    });
    if (!client) {
      return errorResponse('Cliente não encontrado.', 404);
    }
  }

  const project = await db.projects.create({
    data: {
      ...data,
      companyId: context!.companyId!,
      estimatedValue: data.estimatedValue ?? 0,
      actualValue: 0,
      physicalProgress: 0,
      financialProgress: 0,
    },
    include: {
      clients: true,
    },
  });

  // Emitir evento de realtime
  emitProjectEvent.created(context!.companyId!, project, context!.user.id);

  // Criar notificação para usuários da empresa
  emitNotificationEvent.new(context!.companyId!, {
    id: `proj_${project.id}_${Date.now()}`,
    type: 'info',
    title: 'Novo Projeto',
    message: `Projeto "${project.name}" foi criado com sucesso.`,
    entityId: project.id,
    entityType: 'project',
    read: false,
    createdAt: new Date(),
  });

  return successResponse(project, 'Projeto criado com sucesso.');
}
