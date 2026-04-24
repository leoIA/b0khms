// =============================================================================
// ConstrutorPro - Project by ID API
// GET, PUT, DELETE /api/projetos/[id]
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  requireOwnership,
  successResponse,
  errorResponse,
  parseRequestBody,
} from '@/server/auth';
import { getValidId, apiError, apiResponse, notFoundError } from '@/lib/api';
import { updateProjectSchema } from '@/validators/auth';
import { Decimal } from '@prisma/client/runtime/library';
import { emitProjectEvent, emitNotificationEvent } from '@/lib/realtime';

// -----------------------------------------------------------------------------
// GET /api/projetos/[id] - Get project by ID with related data
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validId = getValidId({ id });

  if (!validId) {
    return apiError('ID inválido.', { status: 400 });
  }

  const authResult = await requireOwnership('project', validId);

  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  const project = await db.projects.findUnique({
    where: { id: validId },
    include: {
      clients: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      schedules: {
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      daily_logs: {
        select: {
          id: true,
          date: true,
          summary: true,
        },
        orderBy: { date: 'desc' },
        take: 5,
      },
      transactions: {
        select: {
          id: true,
          type: true,
          value: true,
          date: true,
          status: true,
        },
        orderBy: { date: 'desc' },
        take: 10,
      },
      budgets: {
        select: {
          id: true,
          name: true,
          status: true,
          totalValue: true,
        },
      },
      _count: {
        select: {
          schedules: true,
          daily_logs: true,
          transactions: true,
          budgets: true,
        },
      },
    },
  });

  if (!project) {
    return notFoundError('Projeto não encontrado.');
  }

  // Calculate budget totals
  const budgetTotals = {
    totalBudgeted: 0,
    approvedBudget: 0,
    pendingBudget: 0,
  };

  if (project.budgets.length > 0) {
    budgetTotals.totalBudgeted = project.budgets.reduce((sum, b) => {
      return sum + (typeof b.totalValue === 'object' && 'toNumber' in b.totalValue 
        ? b.totalValue.toNumber() 
        : Number(b.totalValue));
    }, 0);

    budgetTotals.approvedBudget = project.budgets
      .filter((b) => b.status === 'approved')
      .reduce((sum, b) => {
        return sum + (typeof b.totalValue === 'object' && 'toNumber' in b.totalValue 
          ? b.totalValue.toNumber() 
          : Number(b.totalValue));
      }, 0);

    budgetTotals.pendingBudget = project.budgets
      .filter((b) => b.status === 'pending' || b.status === 'draft')
      .reduce((sum, b) => {
        return sum + (typeof b.totalValue === 'object' && 'toNumber' in b.totalValue 
          ? b.totalValue.toNumber() 
          : Number(b.totalValue));
      }, 0);
  }

  return apiResponse({
    ...project,
    budgetTotals,
  });
}

// -----------------------------------------------------------------------------
// PUT /api/projetos/[id] - Update project
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validId = getValidId({ id });

  if (!validId) {
    return apiError('ID inválido.', { status: 400 });
  }

  const authResult = await requireOwnership('project', validId);

  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  const { companyId } = authResult.context!;

  const bodyResult = await parseRequestBody(request, updateProjectSchema);

  if (!bodyResult.success) {
    return apiError(bodyResult.error, { status: 400, details: bodyResult.details });
  }

  const data = bodyResult.data;

  // Check if project exists
  const existingProject = await db.projects.findUnique({
    where: { id: validId },
  });

  if (!existingProject) {
    return notFoundError('Projeto não encontrado.');
  }

  // Validate managerId belongs to same company if provided
  if (data.managerId) {
    const manager = await db.users.findFirst({
      where: {
        id: data.managerId,
        companyId,
      },
    });

    if (!manager) {
      return apiError('Gestor não encontrado na sua empresa.', { status: 400 });
    }
  }

  // Validate clientId belongs to same company if provided
  if (data.clientId) {
    const client = await db.clients.findFirst({
      where: {
        id: data.clientId,
        companyId,
      },
    });

    if (!client) {
      return apiError('Cliente não encontrado na sua empresa.', { status: 400 });
    }
  }

  // Check for duplicate code if provided
  if (data.code !== undefined && data.code !== null && data.code !== existingProject.code) {
    const duplicateProject = await db.projects.findFirst({
      where: {
        companyId,
        code: data.code,
        NOT: { id: validId },
      },
    });

    if (duplicateProject) {
      return apiError('Já existe outro projeto com este código.', { status: 400 });
    }
  }

  // Build update data with proper handling of nullable fields
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.startDate !== undefined) updateData.startDate = data.startDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.estimatedValue !== undefined) updateData.estimatedValue = data.estimatedValue;
  if (data.actualValue !== undefined) updateData.actualValue = data.actualValue;
  if (data.physicalProgress !== undefined) updateData.physicalProgress = data.physicalProgress;
  if (data.financialProgress !== undefined) updateData.financialProgress = data.financialProgress;
  if (data.managerId !== undefined) updateData.managerId = data.managerId;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.clientId !== undefined) updateData.clientId = data.clientId;

  // Update project
  const project = await db.projects.update({
    where: { id: validId },
    data: updateData,
    include: {
      clients: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Emitir evento de realtime
  const statusChanged = data.status && data.status !== existingProject.status;
  const userId = authResult.context!.user.id;
  if (statusChanged) {
    emitProjectEvent.statusChanged(companyId, project, userId);
  } else {
    emitProjectEvent.updated(companyId, project, userId);
  }

  return apiResponse(project, { message: 'Projeto atualizado com sucesso.' });
}

// -----------------------------------------------------------------------------
// DELETE /api/projetos/[id] - Delete project (hard delete with cascade)
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validId = getValidId({ id });

  if (!validId) {
    return apiError('ID inválido.', { status: 400 });
  }

  const authResult = await requireOwnership('project', validId);

  if (!authResult.success) {
    return apiError(authResult.error!, { status: authResult.status });
  }

  // Check if project exists and get related counts
  const existingProject = await db.projects.findUnique({
    where: { id: validId },
    include: {
      _count: {
        select: {
          schedules: true,
          daily_logs: true,
          transactions: true,
          budgets: true,
        },
      },
    },
  });

  if (!existingProject) {
    return notFoundError('Projeto não encontrado.');
  }

  // Note: Based on Prisma schema, cascade delete is configured:
  // - schedules -> onDelete: Cascade
  // - daily_logs -> onDelete: Cascade
  // - transactions -> onDelete: SetNull (not cascade)
  // - budgets -> onDelete: SetNull (not cascade)

  // For safety, check if there are transactions or budgets that would be orphaned
  const hasRelatedData =
    existingProject._count.schedules > 0 ||
    existingProject._count.daily_logs > 0 ||
    existingProject._count.transactions > 0 ||
    existingProject._count.budgets > 0;

  // Allow deletion - cascade will handle related data based on schema
  // Transactions and budgets will have projectId set to null (SetNull)
  // Schedules and daily_logs will be deleted (Cascade)

  // Delete project (cascade handles related records)
  await db.projects.delete({
    where: { id: validId },
  });

  // Emitir evento de realtime
  const { companyId, user } = authResult.context!;
  emitProjectEvent.deleted(companyId, validId, user.id);

  // Notificar exclusão
  emitNotificationEvent.new(companyId, {
    id: `proj_del_${validId}_${Date.now()}`,
    type: 'warning',
    title: 'Projeto Excluído',
    message: `Projeto "${existingProject.name}" foi excluído.`,
    entityId: validId,
    entityType: 'project',
    read: false,
    createdAt: new Date(),
  });

  return apiResponse(null, {
    message: hasRelatedData
      ? 'Projeto excluído com sucesso. Dados relacionados foram processados conforme configuração.'
      : 'Projeto excluído com sucesso.',
  });
}
