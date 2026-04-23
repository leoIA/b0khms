// =============================================================================
// ConstrutorPro - Metrics Export API
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { metricsService, type MetricPeriod } from '@/lib/metrics-service';

// -----------------------------------------------------------------------------
// GET - Export Metrics to CSV
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

  try {
    const metrics = await metricsService.getDashboardMetrics(context!.companyId, {
      period,
      startDate,
      endDate,
    });

    const csv = metricsService.exportToCSV(metrics);

    return new Response('\ufeff' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="metrics-${context!.companyId}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting metrics:', error);
    return errorResponse('Erro ao exportar métricas', 500);
  }
}
