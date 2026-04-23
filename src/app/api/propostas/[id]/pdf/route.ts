// =============================================================================
// ConstrutorPro - Propostas - Gerar PDF
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, errorResponse } from '@/server/auth';
import { generateProposalPDF, type ProposalPDFData } from '@/lib/pdf/proposal-generator';

// -----------------------------------------------------------------------------
// GET - Generate Proposal PDF
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const companyId = context!.companyId;
  const { id } = await params;

  // Check if proposal exists and belongs to company
  const proposal = await db.proposals.findFirst({
    where: { id, companyId },
    include: {
      clients: true,
      projects: true,
      companies: true,
      proposal_items: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!proposal) {
    return errorResponse('Proposta não encontrada.', 404);
  }

  // Prepare PDF data
  const pdfData: ProposalPDFData = {
    company: {
      name: proposal.companies.name,
      tradingName: proposal.companies.tradingName || undefined,
      cnpj: proposal.companies.cnpj,
      email: proposal.companies.email,
      phone: proposal.companies.phone || undefined,
      address: proposal.companies.address || undefined,
      city: proposal.companies.city || undefined,
      state: proposal.companies.state || undefined,
      zipCode: proposal.companies.zipCode || undefined,
      logo: proposal.companies.logo || undefined,
    },
    proposal: {
      number: proposal.number,
      title: proposal.title,
      objective: proposal.objective || undefined,
      version: proposal.version,
      status: proposal.status,
      subtotal: Number(proposal.subtotal),
      discountType: proposal.discountType || undefined,
      discountValue: proposal.discountValue ? Number(proposal.discountValue) : undefined,
      discountReason: proposal.discountReason || undefined,
      totalValue: Number(proposal.totalValue),
      paymentTerms: proposal.paymentTerms || undefined,
      deliveryTime: proposal.deliveryTime || undefined,
      warrantyTerms: proposal.warrantyTerms || undefined,
      validUntil: proposal.validUntil || undefined,
      deliveryAddress: proposal.deliveryAddress || undefined,
      terms: proposal.terms || undefined,
      clientNotes: proposal.clientNotes || undefined,
      customIntroduction: proposal.customIntroduction || undefined,
      createdAt: proposal.createdAt,
      sentAt: proposal.sentAt || undefined,
      acceptedAt: proposal.acceptedAt || undefined,
    },
    client: proposal.clients ? {
      name: proposal.clients.name,
      email: proposal.clients.email || undefined,
      phone: proposal.clients.phone || undefined,
      mobile: proposal.clients.mobile || undefined,
      cpfCnpj: proposal.clients.cpfCnpj || undefined,
      address: proposal.clients.address || undefined,
      city: proposal.clients.city || undefined,
      state: proposal.clients.state || undefined,
      zipCode: proposal.clients.zipCode || undefined,
    } : undefined,
    project: proposal.projects ? {
      name: proposal.projects.name,
      code: proposal.projects.code || undefined,
      address: proposal.projects.address || undefined,
      city: proposal.projects.city || undefined,
      state: proposal.projects.state || undefined,
    } : undefined,
    items: proposal.proposal_items.map(item => ({
      code: item.code || undefined,
      title: item.title,
      description: item.description || undefined,
      category: item.category || undefined,
      unit: item.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
    options: {
      includeCover: proposal.includeCover,
      includeSummary: proposal.includeSummary,
      includeTimeline: proposal.includeTimeline,
      includeTeam: proposal.includeTeam,
      includePortfolio: proposal.includePortfolio,
      requiresSignature: proposal.requiresSignature,
    },
  };

  try {
    // Generate PDF
    const pdfBuffer = await generateProposalPDF(pdfData);

    // Update proposal with PDF generation timestamp
    await db.proposals.update({
      where: { id },
      data: { pdfGeneratedAt: new Date() },
    });

    // Return PDF as response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proposta-${proposal.number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return errorResponse('Erro ao gerar PDF da proposta.', 500);
  }
}
