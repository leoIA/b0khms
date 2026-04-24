/**
 * Password Reset Request Service
 * Handles token generation, storage, and email sending for password reset
 */

import crypto from 'crypto';
import { db } from '@/lib/db';
import { emailService } from '@/lib/email';
import { auditLogger } from '@/lib/audit-logger';

// =============================================================================
// Configuration
// =============================================================================

const PASSWORD_RESET_CONFIG = {
  tokenLength: 32,
  tokenExpiryMinutes: 30, // 30 minutes
  maxRequestsPerHour: 3, // Rate limiting
} as const;

// =============================================================================
// Types
// =============================================================================

export interface PasswordResetRequest {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PasswordResetResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// Password Reset Service
// =============================================================================

export const passwordResetService = {
  /**
   * Request a password reset
   * Generates a token and sends an email with the reset link
   */
  async requestReset(
    email: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<PasswordResetRequest> {
    const emailLower = email.toLowerCase().trim();
    
    // Find user
    const user = await db.users.findUnique({
      where: { email: emailLower },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        companies: {
          select: {
            name: true,
            isActive: true,
          },
        },
      },
    });
    
    // Don't reveal if user exists or not (security)
    if (!user || !user.isActive || (user.companies && !user.companies.isActive)) {
      // Still return success to prevent email enumeration
      return {
        success: true,
        message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.',
      };
    }
    
    // Check rate limiting (max requests per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTokens = await db.password_reset_tokens.findMany({
      where: {
        email: emailLower,
        createdAt: { gte: oneHourAgo },
      },
    });
    
    if (recentTokens.length >= PASSWORD_RESET_CONFIG.maxRequestsPerHour) {
      // Log rate limit hit
      await auditLogger.log({
        userId: user.id,
        action: 'password_reset_request',
        category: 'authentication',
        severity: 'warning',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { email: emailLower, requestCount: recentTokens.length, rateLimited: true },
      });
      
      return {
        success: true,
        message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.',
      };
    }
    
    // Invalidate any existing tokens for this email
    await db.password_reset_tokens.deleteMany({
      where: { email: emailLower },
    });
    
    // Generate new token
    const token = crypto.randomBytes(PASSWORD_RESET_CONFIG.tokenLength).toString('hex');
    const expires = new Date(Date.now() + PASSWORD_RESET_CONFIG.tokenExpiryMinutes * 60 * 1000);
    
    // Store token
    await db.password_reset_tokens.create({
      data: {
        email: emailLower,
        token,
        expires,
      },
    });
    
    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/redefinir-senha?token=${token}`;
    
    // Send email
    try {
      await emailService.sendPasswordReset(user.email, {
        userName: user.name || 'Usuário',
        resetUrl,
        expiresIn: '30 minutos',
      });
      
      // Log successful request
      await auditLogger.log({
        userId: user.id,
        action: 'password_reset_request',
        category: 'authentication',
        severity: 'info',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    } catch (error) {
      console.error('[Password Reset] Failed to send email:', error);
      // Don't reveal error to user
    }
    
    return {
      success: true,
      message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.',
    };
  },
  
  /**
   * Validate a password reset token
   */
  async validateToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    if (!token || token.length < 32) {
      return { valid: false, error: 'Token inválido' };
    }
    
    const resetToken = await db.password_reset_tokens.findUnique({
      where: { token },
    });
    
    if (!resetToken) {
      return { valid: false, error: 'Token não encontrado' };
    }
    
    if (resetToken.expires < new Date()) {
      // Clean up expired token
      await db.password_reset_tokens.delete({ where: { token } });
      return { valid: false, error: 'Token expirado' };
    }
    
    return { valid: true, email: resetToken.email };
  },
  
  /**
   * Reset password using token
   */
  async resetPassword(
    token: string,
    newPassword: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<PasswordResetResult> {
    // Validate token
    const validation = await this.validateToken(token);
    
    if (!validation.valid || !validation.email) {
      return { success: false, error: validation.error || 'Token inválido' };
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return { success: false, error: 'A senha deve ter pelo menos 8 caracteres' };
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      return { success: false, error: 'A senha deve conter pelo menos uma letra maiúscula' };
    }
    
    if (!/[a-z]/.test(newPassword)) {
      return { success: false, error: 'A senha deve conter pelo menos uma letra minúscula' };
    }
    
    if (!/[0-9]/.test(newPassword)) {
      return { success: false, error: 'A senha deve conter pelo menos um número' };
    }
    
    // Find user
    const user = await db.users.findUnique({
      where: { email: validation.email },
      select: { id: true },
    });
    
    if (!user) {
      return { success: false, error: 'Usuário não encontrado' };
    }
    
    // Hash new password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password and delete token in transaction
    await db.$transaction([
      db.users.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }),
      db.password_reset_tokens.delete({
        where: { token },
      }),
    ]);
    
    // Revoke all existing sessions for this user
    await db.sessions.deleteMany({
      where: { userId: user.id },
    });
    
    // Log successful reset
    await auditLogger.log({
      userId: user.id,
      action: 'password_reset_complete',
      category: 'authentication',
      severity: 'info',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
    
    return { success: true };
  },
  
  /**
   * Clean up expired tokens (can be called by cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await db.password_reset_tokens.deleteMany({
      where: {
        expires: { lt: new Date() },
      },
    });
    
    return result.count;
  },
};
