// =============================================================================
// ConstrutorPro - OpenAPI JSON Endpoint
// =============================================================================

import { NextResponse } from 'next/server';
import { buildOpenAPISpec } from '@/lib/openapi';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const openapiSpec = buildOpenAPISpec(baseUrl);
  
  return NextResponse.json(openapiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
