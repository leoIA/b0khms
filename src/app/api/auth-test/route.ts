// =============================================================================
// ConstrutorPro - Auth Test Endpoint
// Diagnostic endpoint to verify auth configuration
// =============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      session: session ? {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          companyId: session.user.companyId,
        },
        expires: session.expires,
      } : null,
      env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET (hidden)' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get session',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
