// =============================================================================
// ConstrutorPro - AI Chat API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { z } from 'zod';
import ZAI from 'z-ai-web-dev-sdk';

const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1, 'Mensagem é obrigatória'),
});

const SYSTEM_PROMPT = `Você é um assistente especializado em construção civil para o mercado brasileiro. 
Você ajuda engenheiros, arquitetos e profissionais da construção com:
- Composições de preços e orçamentos
- Análise de projetos
- Diário de obra e relatórios
- Planejamento e cronogramas
- Normas técnicas brasileiras (NBR)
- Cálculos de materiais e custos
- Boas práticas de construção

Responda de forma profissional, clara e em português brasileiro.
Quando relevante, cite normas técnicas e boas práticas do setor.`;

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, sendMessageSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const { conversationId, message } = bodyResult.data;
  const { context } = authResult;

  try {
    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await db.ai_conversations.findFirst({
        where: {
          id: conversationId,
          companyId: context!.companyId,
          userId: context!.user.id,
        },
        include: {
          ai_messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Last 20 messages for context
          },
        },
      });

      if (!conversation) {
        return errorResponse('Conversa não encontrada.', 404);
      }
    } else {
      conversation = await db.ai_conversations.create({
        data: {
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          companyId: context!.companyId!,
          userId: context!.user.id,
        },
        include: {
          ai_messages: true,
        },
      });
    }

    // Save user message
    await db.ai_messages.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    });

    // Prepare messages for AI
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...conversation.ai_messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Call AI
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const assistantMessage = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';

    // Save assistant message
    const savedMessage = await db.ai_messages.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantMessage,
        tokens: completion.usage?.total_tokens,
      },
    });

    // Update conversation timestamp
    await db.ai_conversations.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return successResponse({
      conversationId: conversation.id,
      message: savedMessage,
    });
  } catch (error) {
    console.error('[AI Chat Error]', error);
    return errorResponse('Erro ao processar mensagem. Tente novamente.', 500);
  }
}
