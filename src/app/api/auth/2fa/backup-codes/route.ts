/**
 * 2FA Backup Codes Endpoint
 * POST /api/auth/2fa/backup-codes
 * 
 * Regenerates backup codes for the user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { twoFactorService } from '@/lib/two-factor';
import { requireAuth } from '@/server/auth';
import { z } from 'zod';

const backupCodesSchema = z.object({
  token: z.string().length(6, 'Token deve ter 6 dígitos').regex(/^\d+$/, 'Token deve conter apenas números'),
});

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

    // Parse and validate request body
    const body = await request.json();
    const parsed = backupCodesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Get client info for audit
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Regenerate backup codes
    const result = await twoFactorService.regenerateBackupCodes(userId, parsed.data.token, {
      ipAddress,
      userAgent,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          backupCodes: result.backupCodes,
        },
        message: 'Novos códigos de backup gerados com sucesso',
      });
    }

    return NextResponse.json(
      { success: false, error: result.error || 'Erro ao gerar códigos de backup' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[2FA] Backup codes error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar códigos de backup' },
      { status: 500 }
    );
  }
}
