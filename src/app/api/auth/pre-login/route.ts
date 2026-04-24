/**
 * Pre-Login Endpoint
 * POST /api/auth/pre-login
 * 
 * Verifies credentials and checks if 2FA is required.
 * Returns a temporary token for 2FA verification if needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { accountLockout } from '@/lib/account-lockout';
import { auditLogger } from '@/lib/audit-logger';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';

// Store temporary tokens (in production, use Redis)
const tempTokens = new Map<string, { userId: string; email: string; expiresAt: Date }>();

const preLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const parsed = preLoginSchema.safeParse(body);
    
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
    
    const { email, password } = parsed.data;
    const emailLower = email.toLowerCase();
    
    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Check if account is locked
    const isAdmin = email.includes('admin@');
    const lockStatus = accountLockout.checkLockStatus(emailLower, isAdmin);
    
    if (lockStatus.locked) {
      await auditLogger.log({
        action: 'login_failed',
        category: 'authentication',
        status: 'blocked',
        severity: 'warning',
        userId: undefined,
        companyId: undefined,
        ipAddress,
        userAgent,
        errorMessage: 'Account locked',
        metadata: { email: emailLower, reason: 'account_locked', lockedUntil: lockStatus.lockedUntil },
      });
      
      return NextResponse.json(
        { success: false, error: 'Conta bloqueada. Tente novamente mais tarde.' },
        { status: 423 }
      );
    }
    
    // Find user
    const user = await db.users.findUnique({
      where: { email: emailLower },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        isActive: true,
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
    
    if (!user || !user.password) {
      accountLockout.recordLoginFailure(emailLower, isAdmin);
      return NextResponse.json(
        { success: false, error: 'Email ou senha inválidos' },
        { status: 401 }
      );
    }
    
    if (!user.isActive) {
      accountLockout.recordLoginFailure(emailLower, isAdmin);
      return NextResponse.json(
        { success: false, error: 'Conta desativada' },
        { status: 403 }
      );
    }
    
    if (user.companies && !user.companies.isActive) {
      accountLockout.recordLoginFailure(emailLower, isAdmin);
      return NextResponse.json(
        { success: false, error: 'Empresa desativada' },
        { status: 403 }
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      const lockResult = accountLockout.recordLoginFailure(emailLower, user.role === 'master_admin');
      
      await auditLogger.log({
        action: 'login_failed',
        category: 'authentication',
        status: 'failure',
        severity: 'warning',
        userId: user.id,
        companyId: user.companyId ?? undefined,
        ipAddress,
        userAgent,
        errorMessage: 'Invalid password',
        metadata: { email: emailLower, reason: 'invalid_password', remaining: lockResult.remaining },
      });
      
      return NextResponse.json(
        { success: false, error: 'Email ou senha inválidos' },
        { status: 401 }
      );
    }
    
    // Clear failed attempts
    accountLockout.recordLoginSuccess(emailLower, user.role === 'master_admin');
    
    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate temporary token for 2FA verification
      const tempToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      
      tempTokens.set(tempToken, {
        userId: user.id,
        email: user.email,
        expiresAt,
      });
      
      // Clean up expired tokens
      for (const [key, value] of tempTokens.entries()) {
        if (value.expiresAt < new Date()) {
          tempTokens.delete(key);
        }
      }
      
      return NextResponse.json({
        success: true,
        requires2FA: true,
        tempToken,
        email: user.email,
        message: 'Autenticação em dois fatores necessária',
      });
    }
    
    // No 2FA required - return user data for direct login
    return NextResponse.json({
      success: true,
      requires2FA: false,
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
    console.error('[Pre-Login] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar login' },
      { status: 500 }
    );
  }
}

// Export tempTokens for use in 2FA verification
export { tempTokens };
