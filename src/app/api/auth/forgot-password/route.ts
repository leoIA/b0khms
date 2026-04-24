/**
 * Forgot Password Endpoint
 * POST /api/auth/forgot-password
 * 
 * Initiates the password reset process by sending an email with a reset link.
 */

import { NextRequest, NextResponse } from 'next/server';
import { passwordResetService } from '@/lib/password-reset';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email inválido',
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
    
    // Request password reset
    const result = await passwordResetService.requestReset(parsed.data.email, {
      ipAddress,
      userAgent,
    });
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error('[Forgot Password] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}
