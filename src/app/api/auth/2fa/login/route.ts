/**
 * 2FA Login Verification Endpoint
 * POST /api/auth/2fa/login
 * 
 * Verifies 2FA code during login and completes authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { twoFactorService } from '@/lib/two-factor';
import { db } from '@/lib/db';
import { auditLogger } from '@/lib/audit-logger';
import { z } from 'zod';
import { tempTokens } from '../../pre-login/route';

const login2FASchema = z.object({
  email: z.string().email('Email inválido'),
  token: z.string().min(6, 'Token deve ter pelo menos 6 caracteres'),
  tempToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const parsed = login2FASchema.safeParse(body);
    
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
    
    const { email, token, tempToken } = parsed.data;
    const emailLower = email.toLowerCase();
    
    // Get client info for audit
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Validate tempToken if provided
    if (tempToken) {
      const tempData = tempTokens.get(tempToken);
      
      if (!tempData) {
        return NextResponse.json(
          { success: false, error: 'Sessão expirada. Faça login novamente.' },
          { status: 401 }
        );
      }
      
      if (tempData.expiresAt < new Date()) {
        tempTokens.delete(tempToken);
        return NextResponse.json(
          { success: false, error: 'Sessão expirada. Faça login novamente.' },
          { status: 401 }
        );
      }
      
      if (tempData.email !== emailLower) {
        return NextResponse.json(
          { success: false, error: 'Dados de sessão inválidos' },
          { status: 401 }
        );
      }
    }
    
    // Find user
    const user = await db.users.findUnique({
      where: { email: emailLower },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        avatar: true,
        twoFactorEnabled: true,
        companies: {
          select: {
            id: true,
            name: true,
            plan: true,
            isActive: true,
          },
        },
      },
    });
    
    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado ou 2FA não habilitado' },
        { status: 400 }
      );
    }
    
    // Verify 2FA code
    const result = await twoFactorService.verify(user.id, token, {
      ipAddress,
      userAgent,
    });
    
    if (!result.success) {
      // Log failed 2FA attempt
      await auditLogger.log({
        userId: user.id,
        companyId: user.companyId ?? undefined,
        action: '2fa_failed',
        category: 'authentication',
        status: 'failure',
        severity: 'warning',
        ipAddress,
        userAgent,
        errorMessage: 'Invalid 2FA code',
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Código inválido. Tente novamente.',
          remainingAttempts: result.remainingAttempts,
        },
        { status: 400 }
      );
    }
    
    // Clean up temp token
    if (tempToken) {
      tempTokens.delete(tempToken);
    }
    
    // Update last login
    await db.users.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    // Log successful 2FA login
    await auditLogger.log({
      userId: user.id,
      companyId: user.companyId ?? undefined,
      action: 'login',
      category: 'authentication',
      status: 'success',
      severity: 'info',
      ipAddress,
      userAgent,
      metadata: { method: '2fa', email: user.email, role: user.role },
    });
    
    // Return success with user data
    return NextResponse.json({
      success: true,
      message: 'Autenticação realizada com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.companies?.name,
        companyPlan: user.companies?.plan,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('[2FA Login] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar código' },
      { status: 500 }
    );
  }
}
