/**
 * Reset Password Endpoint
 * POST /api/auth/reset-password
 * 
 * Completes the password reset process by validating the token and setting a new password.
 */

import { NextRequest, NextResponse } from 'next/server';
import { passwordResetService } from '@/lib/password-reset';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().min(32, 'Token inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string().min(8, 'A confirmação de senha deve ter pelo menos 8 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    
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
    
    // Reset password
    const result = await passwordResetService.resetPassword(
      parsed.data.token,
      parsed.data.password,
      {
        ipAddress,
        userAgent,
      }
    );
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
      });
    }
    
    return NextResponse.json(
      { success: false, error: result.error || 'Erro ao redefinir senha' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Reset Password] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao redefinir senha' },
      { status: 500 }
    );
  }
}

/**
 * Validate Token Endpoint
 * GET /api/auth/reset-password?token=xxx
 * 
 * Validates if a password reset token is still valid.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 400 }
      );
    }
    
    const validation = await passwordResetService.validateToken(token);
    
    return NextResponse.json({
      success: validation.valid,
      email: validation.email ? `${validation.email.slice(0, 2)}***@${validation.email.split('@')[1]}` : undefined,
      error: validation.error,
    });
  } catch (error) {
    console.error('[Validate Token] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao validar token' },
      { status: 500 }
    );
  }
}
