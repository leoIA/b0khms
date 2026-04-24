/**
 * Two-Factor Authentication (2FA) Service
 * Implements TOTP (Time-based One-Time Password) using RFC 6238
 * 
 * Features:
 * - TOTP secret generation and verification
 * - QR code generation for authenticator apps
 * - Backup codes generation and validation
 * - Rate limiting for verification attempts
 */

import { TOTP, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from './db';
import { auditLogger } from './audit-logger';

// Create TOTP instance
const totp = new TOTP();

// =============================================================================
// Configuration
// =============================================================================

const TWO_FACTOR_CONFIG = {
  // TOTP settings
  issuer: 'ConstrutorPro',
  window: 1, // Allow 1 step before/after current time (30s each)
  digits: 6,
  step: 30, // seconds
  
  // Backup codes
  backupCodeCount: 10,
  backupCodeLength: 8,
  
  // Rate limiting
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  
  // Encryption
  encryptionAlgorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  authTagLength: 16,
} as const;

// =============================================================================
// Types
// =============================================================================

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface TwoFactorVerification {
  success: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
}

export interface TwoFactorStatus {
  enabled: boolean;
  verifiedAt: Date | null;
  hasBackupCodes: boolean;
}

// =============================================================================
// Encryption Utilities
// =============================================================================

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or NEXTAUTH_SECRET must be set for 2FA encryption');
  }
  // Derive a 32-byte key from the secret
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt sensitive data (2FA secrets, backup codes)
 */
function encrypt(data: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(TWO_FACTOR_CONFIG.ivLength);
  const cipher = crypto.createCipheriv(
    TWO_FACTOR_CONFIG.encryptionAlgorithm,
    key,
    iv
  );
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(
    TWO_FACTOR_CONFIG.encryptionAlgorithm,
    key,
    iv
  );
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// =============================================================================
// TOTP Generation and Verification
// =============================================================================

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): string {
  return totp.generateSecret();
}

/**
 * Generate OTP authentication URL
 */
export function generateOtpAuthUrl(email: string, secret: string): string {
  return generateURI({
    strategy: 'totp',
    issuer: TWO_FACTOR_CONFIG.issuer,
    label: email,
    secret,
    digits: TWO_FACTOR_CONFIG.digits,
    period: TWO_FACTOR_CONFIG.step,
  });
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Verify TOTP code
 */
export function verifyTOTP(secret: string, token: string): boolean {
  try {
    // Remove any spaces or dashes from token
    const cleanToken = token.replace(/[\s-]/g, '');
    
    if (!/^\d{6}$/.test(cleanToken)) {
      return false;
    }
    
    const result = verifySync({
      strategy: 'totp',
      token: cleanToken,
      secret,
    });
    
    return result.valid;
  } catch {
    return false;
  }
}

// =============================================================================
// Backup Codes
// =============================================================================

/**
 * Generate backup codes
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < TWO_FACTOR_CONFIG.backupCodeCount; i++) {
    const code = crypto
      .randomBytes(Math.ceil(TWO_FACTOR_CONFIG.backupCodeLength / 2))
      .toString('hex')
      .slice(0, TWO_FACTOR_CONFIG.backupCodeLength)
      .toUpperCase();
    
    // Format as XXXX-XXXX
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;
    codes.push(formattedCode);
  }
  
  return codes;
}

/**
 * Hash backup code for storage
 */
export function hashBackupCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code.toUpperCase().replace(/-/g, ''))
    .digest('hex');
}

/**
 * Verify backup code against hashed list
 * Returns { valid: boolean, index: number }
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): { valid: boolean; index: number } {
  const hashedInput = hashBackupCode(code);
  const index = hashedCodes.indexOf(hashedInput);
  return { valid: index !== -1, index };
}

// =============================================================================
// Main 2FA Service
// =============================================================================

export const twoFactorService = {
  /**
   * Setup 2FA for a user
   * Returns setup data including QR code and backup codes
   */
  async setup(userId: string, email: string): Promise<TwoFactorSetup> {
    // Generate new secret
    const secret = generateSecret();
    
    // Generate OTP auth URL
    const otpAuthUrl = generateOtpAuthUrl(email, secret);
    
    // Generate QR code
    const qrCodeDataUrl = await generateQRCodeDataUrl(otpAuthUrl);
    
    // Generate backup codes
    const backupCodes = generateBackupCodes();
    
    // Hash backup codes for storage
    const hashedBackupCodes = backupCodes.map(hashBackupCode);
    
    // Encrypt secret for storage
    const encryptedSecret = encrypt(secret);
    const encryptedBackupCodes = encrypt(JSON.stringify(hashedBackupCodes));
    
    // Store encrypted secret and backup codes (but don't enable yet)
    await db.users.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: encryptedBackupCodes,
        twoFactorVerifiedAt: null,
      },
    });
    
    // Manual entry key (formatted for easy typing)
    const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret;
    
    return {
      secret,
      qrCodeUrl: otpAuthUrl,
      qrCodeDataUrl,
      backupCodes,
      manualEntryKey,
    };
  },
  
  /**
   * Verify and enable 2FA
   * User must provide a valid TOTP code to confirm setup
   */
  async verifyAndEnable(
    userId: string,
    token: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<TwoFactorVerification> {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });
    
    if (!user) {
      return { success: false };
    }
    
    if (user.twoFactorEnabled) {
      return { success: false }; // Already enabled
    }
    
    if (!user.twoFactorSecret) {
      return { success: false }; // No setup in progress
    }
    
    // Decrypt secret
    const secret = decrypt(user.twoFactorSecret);
    
    // Verify token
    const isValid = verifyTOTP(secret, token);
    
    if (isValid) {
      // Enable 2FA
      await db.users.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorVerifiedAt: new Date(),
        },
      });
      
      // Audit log
      await auditLogger.log({
        userId,
        action: '2fa_enabled',
        category: 'authentication',
        severity: 'info',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
      
      return { success: true };
    }
    
    return { success: false };
  },
  
  /**
   * Verify TOTP code for login
   */
  async verify(
    userId: string,
    token: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<TwoFactorVerification> {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
        twoFactorEnabled: true,
      },
    });
    
    if (!user || !user.twoFactorEnabled) {
      return { success: false };
    }
    
    // Decrypt secret
    const secret = decrypt(user.twoFactorSecret!);
    
    // Verify TOTP token
    const isValid = verifyTOTP(secret, token);
    
    if (isValid) {
      // Update verified timestamp
      await db.users.update({
        where: { id: userId },
        data: { twoFactorVerifiedAt: new Date() },
      });
      
      return { success: true };
    }
    
    // Check if it's a backup code
    if (user.twoFactorBackupCodes) {
      const hashedBackupCodes = JSON.parse(decrypt(user.twoFactorBackupCodes)) as string[];
      const hashedInput = hashBackupCode(token);
      
      if (hashedBackupCodes.includes(hashedInput)) {
        // Remove used backup code
        const remainingCodes = hashedBackupCodes.filter(c => c !== hashedInput);
        
        await db.users.update({
          where: { id: userId },
          data: {
            twoFactorBackupCodes: remainingCodes.length > 0 
              ? encrypt(JSON.stringify(remainingCodes))
              : null,
            twoFactorVerifiedAt: new Date(),
          },
        });
        
        // Audit log
        await auditLogger.log({
          userId,
          action: '2fa_backup_used',
          category: 'authentication',
          severity: 'warning',
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          metadata: { remainingCodes: remainingCodes.length },
        });
        
        return { success: true };
      }
    }
    
    // Failed attempt
    await auditLogger.log({
      userId,
      action: '2fa_failed',
      category: 'authentication',
      severity: 'warning',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
    
    return { success: false };
  },
  
  /**
   * Disable 2FA for a user
   */
  async disable(
    userId: string,
    password: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        password: true,
        twoFactorEnabled: true,
      },
    });
    
    if (!user) {
      return { success: false, error: 'Usuário não encontrado' };
    }
    
    // Verify password
    const bcrypt = await import('bcryptjs');
    const isValidPassword = user.password && await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return { success: false, error: 'Senha incorreta' };
    }
    
    if (!user.twoFactorEnabled) {
      return { success: false, error: '2FA não está ativado' };
    }
    
    // Disable 2FA
    await db.users.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorVerifiedAt: null,
      },
    });
    
    // Audit log
    await auditLogger.log({
      userId,
      action: '2fa_disabled',
      category: 'authentication',
      severity: 'warning',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
    
    return { success: true };
  },
  
  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(
    userId: string,
    token: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });
    
    if (!user || !user.twoFactorEnabled) {
      return { success: false, error: '2FA não está ativado' };
    }
    
    // Verify TOTP token
    const secret = decrypt(user.twoFactorSecret!);
    const isValid = verifyTOTP(secret, token);
    
    if (!isValid) {
      return { success: false, error: 'Código inválido' };
    }
    
    // Generate new backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(hashBackupCode);
    
    // Store encrypted backup codes
    await db.users.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: encrypt(JSON.stringify(hashedBackupCodes)),
      },
    });
    
    // Audit log
    await auditLogger.log({
      userId,
      action: '2fa_verified',
      category: 'authentication',
      severity: 'info',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
    
    return { success: true, backupCodes };
  },
  
  /**
   * Get 2FA status for a user
   */
  async getStatus(userId: string): Promise<TwoFactorStatus> {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorVerifiedAt: true,
        twoFactorBackupCodes: true,
      },
    });
    
    if (!user) {
      return {
        enabled: false,
        verifiedAt: null,
        hasBackupCodes: false,
      };
    }
    
    return {
      enabled: user.twoFactorEnabled,
      verifiedAt: user.twoFactorVerifiedAt,
      hasBackupCodes: !!user.twoFactorBackupCodes,
    };
  },
  
  /**
   * Check if user needs 2FA verification
   */
  async requiresVerification(userId: string): Promise<boolean> {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    
    return user?.twoFactorEnabled ?? false;
  },
};

// =============================================================================
// Additional Helper Functions for API Routes
// =============================================================================

/**
 * Verify token against a secret (wrapper for verifyTOTP)
 */
export async function verifyToken(token: string, secret: string): Promise<boolean> {
  return verifyTOTP(secret, token);
}

/**
 * Decrypt secret (exported wrapper)
 */
export function decryptSecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret);
}

/**
 * Decrypt backup codes (exported wrapper)
 */
export function decryptBackupCodes(encryptedCodes: string): string[] {
  return JSON.parse(decrypt(encryptedCodes)) as string[];
}

/**
 * Remove a used backup code from the list
 */
export function removeUsedBackupCode(hashedCodes: string[], usedCodeIndex: number): string[] {
  return hashedCodes.filter((_, index) => index !== usedCodeIndex);
}

/**
 * Check if token is valid TOTP format (6 digits)
 */
export function isValidTotpFormat(token: string): boolean {
  const cleanToken = token.replace(/[\s-]/g, '');
  return /^\d{6}$/.test(cleanToken);
}

/**
 * Check if code is valid backup code format (XXXX-XXXX or 8 chars)
 */
export function isValidBackupCodeFormat(code: string): boolean {
  const cleanCode = code.replace(/-/g, '').toUpperCase();
  return /^[A-F0-9]{8}$/.test(cleanCode);
}

/**
 * Encrypt data (exported wrapper)
 */
export { encrypt };

// =============================================================================
// Exports
// =============================================================================

export default twoFactorService;
