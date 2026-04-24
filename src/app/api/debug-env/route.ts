// =============================================================================
// Debug Endpoint - Verificar variáveis de ambiente
// =============================================================================

import { NextResponse } from 'next/server';

export async function GET() {
  // Verificar variáveis críticas
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV || 'undefined',
    DATABASE_URL: process.env.DATABASE_URL ? 'SET (length: ' + process.env.DATABASE_URL.length + ')' : 'NOT SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET (length: ' + process.env.NEXTAUTH_SECRET.length + ')' : 'NOT SET',
    // Verificar se DATABASE_URL parece válida
    DATABASE_URL_FORMAT: 'unknown',
    timestamp: new Date().toISOString(),
  };

  // Verificar formato do DATABASE_URL
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      envCheck.DATABASE_URL_FORMAT = `Valid URL - Protocol: ${url.protocol}, Host: ${url.hostname}`;
    } catch (e) {
      envCheck.DATABASE_URL_FORMAT = 'Invalid URL format';
    }
  }

  return NextResponse.json(envCheck, { status: 200 });
}
