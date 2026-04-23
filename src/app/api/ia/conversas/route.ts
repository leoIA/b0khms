// =============================================================================
// ConstrutorPro - AI Conversations API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { z } from 'zod';

const createConversationSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  context: z.string().optional(),
});

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;

  const conversations = await db.ai_conversations.findMany({
    where: {
      companyId: context!.companyId,
      userId: context!.user.id,
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return successResponse(conversations);
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, createConversationSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const { context } = authResult;

  const conversation = await db.ai_conversations.create({
    data: {
      title: bodyResult.data.title,
      context: bodyResult.data.context,
      companyId: context!.companyId!,
      userId: context!.user.id,
    },
  });

  return successResponse(conversation, 'Conversa criada com sucesso.');
}
