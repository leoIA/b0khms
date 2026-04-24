// =============================================================================
// ConstrutorPro - Metrics & Analytics API
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { metricsService, type MetricPeriod, type MetricCategory } from '@/lib/metrics-service';

// -----------------------------------------------------------------------------
// GET - Get Dashboard Metrics
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
  const projectIds = searchParams.get('projectIds')?.split(',');

  try {
    const metrics = await metricsService.getDashboardMetrics(context!.companyId, {
      period,
      startDate,
      endDate,
      categories,
      projectIds,
    });

    return successResponse(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return errorResponse('Erro ao buscar métricas', 500);
  }
}
