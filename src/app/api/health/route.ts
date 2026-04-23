// =============================================================================
// ConstrutorPro - Health Check API
// System health monitoring endpoint for load balancers and monitoring
// =============================================================================

import { NextResponse } from 'next/server';
import { HealthCheck } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/health
 * Returns system health status for load balancers and monitoring
 */
export async function GET() {
  try {
    const health = await HealthCheck.getSystemHealth();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

/**
 * HEAD /api/health
 * Simple ping endpoint for load balancers
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
