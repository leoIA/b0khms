/**
 * 2FA Status Endpoint
 * GET /api/auth/2fa/status
 * 
 * Returns the current 2FA status for the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { twoFactorService } from '@/lib/two-factor';
import { requireAuth } from '@/server/auth';

export async function GET(request: NextRequest) {
  try {
    // Require auth
    const authResult = await requireAuth();
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const userId = authResult.context!.user.id;

    // Get 2FA status
    const status = await twoFactorService.getStatus(userId);
    
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('[2FA] Status error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao obter status do 2FA' },
      { status: 500 }
    );
  }
}
