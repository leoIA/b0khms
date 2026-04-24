/**
 * 2FA Setup Endpoint
 * POST /api/auth/2fa/setup
 * 
 * Initiates 2FA setup for the authenticated user.
 * Returns QR code URL and backup codes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { twoFactorService } from '@/lib/two-factor';
import { requireAuth } from '@/server/auth';

export async function POST(request: NextRequest) {
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
    const userEmail = authResult.context!.user.email;

    // Check if 2FA is already enabled
    const status = await twoFactorService.getStatus(userId);
    if (status.enabled) {
      return NextResponse.json(
        { success: false, error: '2FA já está ativado. Desative primeiro para configurar novamente.' },
        { status: 400 }
      );
    }
    
    // Get client info for audit
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Setup 2FA
    const setup = await twoFactorService.setup(userId, userEmail);
    
    // Log setup initiation
    console.log(`[2FA] Setup initiated for user ${userId} from ${ipAddress}`);
    
    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: setup.qrCodeUrl,
        qrCodeDataUrl: setup.qrCodeDataUrl,
        manualEntryKey: setup.manualEntryKey,
        backupCodes: setup.backupCodes,
      },
    });
  } catch (error) {
    console.error('[2FA] Setup error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao configurar 2FA' },
      { status: 500 }
    );
  }
}
