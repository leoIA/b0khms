// =============================================================================
// ConstrutorPro - Client by ID API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOwnership, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, getValidId } from '@/lib/api';
import { updateClientSchema } from '@/validators/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const authResult = await requireOwnership('client', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const client = await db.clients.findUnique({
    where: { id },
    include: {
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
          physicalProgress: true,
          estimatedValue: true,
          startDate: true,
          endDate: true,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { projects: true, transactions: true },
      },
    },
  });

  if (!client) {
    return errorResponse('Cliente não encontrado.', 404);
  }

  return successResponse(client);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const authResult = await requireOwnership('client', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, updateClientSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const client = await db.clients.update({
    where: { id },
    data: bodyResult.data,
  });

  return successResponse(client, 'Cliente atualizado com sucesso.');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const authResult = await requireOwnership('client', id);
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  // Check for related projects
  const projectCount = await db.projects.count({
    where: { clientId: id },
  });

  if (projectCount > 0) {
    return errorResponse(
      'Não é possível excluir cliente com projetos vinculados.',
      400
    );
  }

  await db.clients.delete({
    where: { id },
  });

  return successResponse(null, 'Cliente excluído com sucesso.');
}
