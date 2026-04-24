// =============================================================================
// Diagnostic Endpoint - Verificar configuração do sistema
// =============================================================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    variables: {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    },
  };

  // Testar conexão com banco de dados
  if (process.env.DATABASE_URL) {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.$connect();
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      await prisma.$disconnect();

      diagnostics.database = {
        status: 'connected',
        test: result,
      };
    } catch (error) {
      diagnostics.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } else {
    diagnostics.database = {
      status: 'not_configured',
      message: 'DATABASE_URL not set',
    };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
