// =============================================================================
// ConstrutorPro - API Pública de Propostas
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/server/auth';

// -----------------------------------------------------------------------------
// GET - Get proposal by public token
// -----------------------------------------------------------------------------

export async function GET(
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
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            tradingName: true,
            cnpj: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            logo: true,
          },
        },
        clients: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            mobile: true,
            cpfCnpj: true,
            address: true,
            city: true,
            state: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            city: true,
            state: true,
          },
        },
        proposal_items: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!proposal) {
      return errorResponse('Proposta não encontrada.', 404);
    }

    // Check if proposal is expired
    if (proposal.validUntil && new Date(proposal.validUntil) < new Date()) {
      return errorResponse('Esta proposta expirou.', 410);
    }

    // Check if proposal can be viewed publicly
    if (!['sent', 'viewed', 'accepted', 'rejected'].includes(proposal.status)) {
      return errorResponse('Esta proposta não está disponível para visualização.', 404);
    }

    // Convert Decimal values to numbers
    const serializedProposal = {
      ...proposal,
      subtotal: Number(proposal.subtotal),
      discountValue: proposal.discountValue ? Number(proposal.discountValue) : null,
      totalValue: Number(proposal.totalValue),
      proposal_items: proposal.proposal_items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    };

    return successResponse(serializedProposal);
  } catch (error: any) {
    console.error('Error fetching public proposal:', error);
    return errorResponse('Erro ao carregar proposta.', 500);
  }
}
