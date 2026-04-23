// =============================================================================
// ConstrutorPro - Dashboard de Vendas - Métricas
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { Decimal } from '@prisma/client/runtime/library';

// -----------------------------------------------------------------------------
// GET - Sales Metrics Dashboard
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const companyId = context!.companyId;
  const isMasterAdmin = context!.isMasterAdmin;

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month'; // week, month, quarter, year
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Calculate date range
  const now = new Date();
  let dateFrom: Date;
  let dateTo: Date = now;

  switch (period) {
    case 'week':
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      dateFrom = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      dateFrom = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      dateFrom = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      dateTo = endDate ? new Date(endDate) : now;
  }

  // Company filter
  const companyFilter = isMasterAdmin ? {} : { companyId };

  // Fetch proposals data
  const proposals = await db.proposals.findMany({
    where: {
      ...companyFilter,
      isLatest: true,
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    select: {
      id: true,
      status: true,
      totalValue: true,
      createdAt: true,
      sentAt: true,
      acceptedAt: true,
      rejectedAt: true,
      validUntil: true,
      clientId: true,
      clients: {
        select: { id: true, name: true },
      },
    },
  });

  // Calculate metrics
  const totalProposals = proposals.length;
  const draftProposals = proposals.filter(p => p.status === 'draft').length;
  const sentProposals = proposals.filter(p => ['sent', 'viewed'].includes(p.status)).length;
  const acceptedProposals = proposals.filter(p => p.status === 'accepted').length;
  const rejectedProposals = proposals.filter(p => p.status === 'rejected').length;
  const expiredProposals = proposals.filter(p => p.status === 'expired').length;

  // Financial metrics
  const totalValue = proposals.reduce((sum, p) => sum + Number(p.totalValue), 0);
  const acceptedValue = proposals
    .filter(p => p.status === 'accepted')
    .reduce((sum, p) => sum + Number(p.totalValue), 0);
  const pendingValue = proposals
    .filter(p => ['sent', 'viewed'].includes(p.status))
    .reduce((sum, p) => sum + Number(p.totalValue), 0);

  // Conversion rate
  const conversionRate = sentProposals + acceptedProposals + rejectedProposals > 0
    ? (acceptedProposals / (sentProposals + acceptedProposals + rejectedProposals)) * 100
    : 0;

  // Average proposal value
  const avgProposalValue = totalProposals > 0 ? totalValue / totalProposals : 0;

  // Proposals by status
  const proposalsByStatus = [
    { status: 'draft', label: 'Rascunho', count: draftProposals, value: proposals.filter(p => p.status === 'draft').reduce((s, p) => s + Number(p.totalValue), 0) },
    { status: 'sent', label: 'Enviada', count: sentProposals, value: pendingValue },
    { status: 'accepted', label: 'Aceita', count: acceptedProposals, value: acceptedValue },
    { status: 'rejected', label: 'Rejeitada', count: rejectedProposals, value: proposals.filter(p => p.status === 'rejected').reduce((s, p) => s + Number(p.totalValue), 0) },
    { status: 'expired', label: 'Expirada', count: expiredProposals, value: proposals.filter(p => p.status === 'expired').reduce((s, p) => s + Number(p.totalValue), 0) },
  ];

  // Proposals by month (for chart)
  const proposalsByMonth = await db.$queryRaw<Array<{ month: Date; count: bigint; total_value: Decimal }>>`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      COUNT(*) as count,
      SUM("totalValue") as total_value
    FROM proposals
    WHERE "companyId" ${isMasterAdmin ? db.$queryRaw`IS NOT NULL` : db.$queryRaw`= ${companyId}`}
      AND "isLatest" = true
      AND "createdAt" >= ${dateFrom}
      AND "createdAt" <= ${dateTo}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month ASC
  `;

  const monthlyData = proposalsByMonth.map(row => ({
    month: row.month.toISOString().substring(0, 7),
    count: Number(row.count),
    totalValue: Number(row.total_value || 0),
  }));

  // Top clients by proposal value
  const topClients = await db.proposals.groupBy({
    by: ['clientId'],
    where: {
      ...companyFilter,
      isLatest: true,
      createdAt: { gte: dateFrom, lte: dateTo },
      clientId: { not: null },
    },
    _count: { id: true },
    _sum: { totalValue: true },
    orderBy: { _sum: { totalValue: 'desc' } },
    take: 10,
  });

  // Fetch client names
  const clientIds = topClients.map(c => c.clientId).filter(Boolean) as string[];
  const clients = await db.clients.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true },
  });

  const topClientsData = topClients.map(c => ({
    clientId: c.clientId,
    clientName: clients.find(cl => cl.id === c.clientId)?.name || 'N/A',
    proposalsCount: c._count.id,
    totalValue: Number(c._sum.totalValue || 0),
  }));

  // Expiring soon proposals (next 7 days)
  const expiringSoon = await db.proposals.findMany({
    where: {
      ...companyFilter,
      isLatest: true,
      status: { in: ['sent', 'viewed'] },
      validUntil: {
        gte: now,
        lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      number: true,
      title: true,
      totalValue: true,
      validUntil: true,
      clients: { select: { id: true, name: true } },
    },
    take: 10,
  });

  // Pending follow-ups
  const pendingFollowups = await db.proposal_followups.findMany({
    where: {
      companyId: isMasterAdmin ? undefined : companyId,
      status: 'pending',
      scheduledAt: { lte: now },
    },
    include: {
      proposals: {
        select: { id: true, number: true, title: true },
      },
      users: { select: { id: true, name: true } },
    },
    take: 10,
    orderBy: { scheduledAt: 'asc' },
  });

  // Recent activity
  const recentProposals = await db.proposals.findMany({
    where: {
      ...companyFilter,
      isLatest: true,
    },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      totalValue: true,
      createdAt: true,
      clients: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  // Proposal funnel metrics
  const funnel = {
    draft: draftProposals,
    sent: sentProposals,
    viewed: proposals.filter(p => p.status === 'viewed').length,
    accepted: acceptedProposals,
  };

  // Average time to acceptance (for accepted proposals)
  const acceptedWithDates = proposals.filter(p => p.status === 'accepted' && p.sentAt && p.acceptedAt);
  const avgTimeToAcceptance = acceptedWithDates.length > 0
    ? acceptedWithDates.reduce((sum, p) => {
        const sentAt = p.sentAt ? new Date(p.sentAt) : new Date(p.createdAt);
        const acceptedAt = p.acceptedAt ? new Date(p.acceptedAt) : new Date();
        return sum + (acceptedAt.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / acceptedWithDates.length
    : 0;

  return successResponse({
    summary: {
      totalProposals,
      draftProposals,
      sentProposals,
      acceptedProposals,
      rejectedProposals,
      expiredProposals,
      totalValue,
      acceptedValue,
      pendingValue,
      conversionRate,
      avgProposalValue,
      avgTimeToAcceptance,
    },
    proposalsByStatus,
    monthlyData,
    topClients: topClientsData,
    expiringSoon,
    pendingFollowups,
    recentProposals,
    funnel,
    period,
    dateRange: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
  });
}
