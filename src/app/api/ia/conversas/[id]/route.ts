// =============================================================================
// ConstrutorPro - AI Conversation by ID API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse, notFoundResponse } from '@/server/auth';

// -----------------------------------------------------------------------------
// GET - Get Conversation by ID with Messages
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, user } = authResult.context!;

  // Fetch conversation with ownership validation in a single query
  const conversation = await db.ai_conversations.findFirst({
    where: {
      id,
      companyId,
      userId: user.id,
    },
    include: {
      ai_messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversation) {
    return notFoundResponse('Conversa não encontrada');
  }

  return successResponse(conversation);
}

// -----------------------------------------------------------------------------
// DELETE - Delete Conversation
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, user } = authResult.context!;

  // Verify ownership before deletion
  const conversation = await db.ai_conversations.findFirst({
    where: {
      id,
      companyId,
      userId: user.id,
    },
  });

  if (!conversation) {
    return notFoundResponse('Conversa não encontrada');
  }

  // Delete conversation (messages will be cascade deleted via Prisma schema)
  await db.ai_conversations.delete({
    where: { id },
  });

  return successResponse(null, 'Conversa excluída com sucesso');
}
