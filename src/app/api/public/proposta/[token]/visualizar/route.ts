// =============================================================================
// ConstrutorPro - API Pública - Marcar Proposta como Visualizada
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/server/auth';

// -----------------------------------------------------------------------------
// POST - Mark proposal as viewed
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return errorResponse('Token não informado.', 400);
    }

    // Find proposal by public token
    const proposal = await db.proposals.findFirst({
      where: {
        publicToken: token,
        isLatest: true,
      },
    });

    if (!proposal) {
      return errorResponse('Proposta não encontrada.', 404);
    }

    // Only mark as viewed if status is 'sent'
    if (proposal.status === 'sent') {
      await db.proposals.update({
        where: { id: proposal.id },
        data: {
          status: 'viewed',
          viewedAt: new Date(),
          viewedCount: proposal.viewedCount + 1,
        },
      });
    } else if (proposal.status === 'viewed') {
      // Just increment the view count
      await db.proposals.update({
        where: { id: proposal.id },
        data: {
          viewedCount: proposal.viewedCount + 1,
        },
      });
    }

    return successResponse({ viewed: true });
  } catch (error: any) {
    console.error('Error marking proposal as viewed:', error);
    return errorResponse('Erro ao marcar proposta como visualizada.', 500);
  }
}
