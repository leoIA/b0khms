// =============================================================================
// ConstrutorPro - KPIs API
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { metricsService, type MetricPeriod, type MetricCategory } from '@/lib/metrics-service';

// -----------------------------------------------------------------------------
// GET - Get KPIs
// -----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const { searchParams } = new URL(request.url);

  const period = (searchParams.get('period') || 'month') as MetricPeriod;
  const startDate = searchParams.get('startDate') 
    ? new Date(searchParams.get('startDate')!) 
    : undefined;
  const endDate = searchParams.get('endDate') 
    ? new Date(searchParams.get('endDate')!) 
    : undefined;
  const categories = searchParams.get('categories')?.split(',') as MetricCategory[] | undefined;

  try {
    // Calculate period dates
    const filter = metricsService.calculatePeriod({
      period,
      startDate,
      endDate,
      categories,
    });

    const kpis = await metricsService.getKPIs(
      context!.companyId,
      filter.startDate,
      filter.endDate
    );

    // Filter by categories if specified
    const filteredKpis = categories 
      ? kpis.filter(kpi => categories.includes(kpi.category))
      : kpis;

    return successResponse({
      kpis: filteredKpis,
      period: {
        start: filter.startDate,
        end: filter.endDate,
        label: metricsService.getPeriodLabel(period),
      },
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return errorResponse('Erro ao buscar KPIs', 500);
  }
}
