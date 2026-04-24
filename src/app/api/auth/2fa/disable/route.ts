/**
 * 2FA Disable Endpoint
 * POST /api/auth/2fa/disable
 *
 * Disables 2FA for the user after password verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { twoFactorService } from '@/lib/two-factor';
import { requireAuth } from '@/server/auth';
import { z } from 'zod';

const disableSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
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
    const parsed = disableSchema.safeParse(body);

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

    // Disable 2FA
    const result = await twoFactorService.disable(userId, parsed.data.password, {
      ipAddress,
      userAgent,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Autenticação de dois fatores desativada',
      });
    }

    return NextResponse.json(
      { success: false, error: result.error || 'Erro ao desativar 2FA' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[2FA] Disable error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao desativar 2FA' },
      { status: 500 }
    );
  }
}
