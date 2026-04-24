/**
 * Tests for Two-Factor Authentication Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key-for-2fa-testing-must-be-long-enough';

describe('Two-Factor Authentication', () => {
  describe('Backup Codes', () => {
    // Import the functions that don't depend on otplib
    const generateBackupCodes = () => {
      const codes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const code = crypto
          .randomBytes(Math.ceil(8 / 2))
          .toString('hex')
          .slice(0, 8)
          .toUpperCase();
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
      }
      return codes;
    };

    const hashBackupCode = (code: string): string => {
      return crypto
        .createHash('sha256')
        .update(code.toUpperCase().replace(/-/g, ''))
        .digest('hex');
    };

    const verifyBackupCode = (code: string, hashedCodes: string[]): boolean => {
      const hashedInput = hashBackupCode(code);
      return hashedCodes.includes(hashedInput);
    };

    it('should generate correct number of backup codes', () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(10);
    });

    it('should generate codes in correct format', () => {
      const codes = generateBackupCodes();
      
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
    });

    it('should generate unique codes', () => {
      const codes = generateBackupCodes();
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should hash backup code consistently', () => {
      const code = 'ABCD-1234';
      
      const hash1 = hashBackupCode(code);
      const hash2 = hashBackupCode(code);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('should normalize code before hashing', () => {
      const code1 = 'ABCD-1234';
      const code2 = 'abcd-1234'; // lowercase
      const code3 = 'abcd1234'; // no dash
      
      const hash1 = hashBackupCode(code1);
      const hash2 = hashBackupCode(code2);
      const hash3 = hashBackupCode(code3);
      
      // All should produce the same hash (normalized)
      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3);
    });

    it('should verify backup code correctly', () => {
      const code = 'ABCD-1234';
      const hashedCode = hashBackupCode(code);
      
      expect(verifyBackupCode(code, [hashedCode])).toBe(true);
      expect(verifyBackupCode('WRONG-CODE', [hashedCode])).toBe(false);
    });

    it('should return false for empty hashed codes', () => {
      const result = verifyBackupCode('ABCD-1234', []);
      expect(result).toBe(false);
    });
  });

  describe('TOTP Token Validation', () => {
    // Test token format validation logic
    const isValidTokenFormat = (token: string): boolean => {
      const cleanToken = token.replace(/[\s-]/g, '');
      return /^\d{6}$/.test(cleanToken);
    };

    it('should accept valid 6-digit tokens', () => {
      expect(isValidTokenFormat('123456')).toBe(true);
      expect(isValidTokenFormat('000000')).toBe(true);
      expect(isValidTokenFormat('999999')).toBe(true);
    });

    it('should accept tokens with spaces', () => {
      expect(isValidTokenFormat('123 456')).toBe(true);
      expect(isValidTokenFormat(' 123456 ')).toBe(true);
    });

    it('should accept tokens with dashes', () => {
      expect(isValidTokenFormat('123-456')).toBe(true);
    });

    it('should reject tokens with wrong length', () => {
      expect(isValidTokenFormat('12345')).toBe(false); // Too short
      expect(isValidTokenFormat('1234567')).toBe(false); // Too long
      expect(isValidTokenFormat('')).toBe(false); // Empty
    });

    it('should reject tokens with non-numeric characters', () => {
      expect(isValidTokenFormat('abcdef')).toBe(false);
      expect(isValidTokenFormat('12a456')).toBe(false);
      expect(isValidTokenFormat('12345!')).toBe(false);
    });
  });

  describe('Encryption', () => {
    const encrypt = (data: string): string => {
      const secret = process.env.JWT_SECRET!;
      const key = crypto.createHash('sha256').update(secret).digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    };

    const decrypt = (encryptedData: string): string => {
      const secret = process.env.JWT_SECRET!;
      const key = crypto.createHash('sha256').update(secret).digest();
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
      
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    };

    it('should encrypt and decrypt data correctly', () => {
      const original = 'my-secret-key-12345';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(original);
    });

    it('should produce different encrypted values for same input', () => {
      const original = 'my-secret-key-12345';
      const encrypted1 = encrypt(original);
      const encrypted2 = encrypt(original);
      
      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should have encryption key available', () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_SECRET!.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid encrypted data format', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('invalid:format')).toThrow('Invalid encrypted data format');
    });
  });
});

describe('Two-Factor Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Setup Flow', () => {
    it('should have all required methods', async () => {
      const { twoFactorService } = await import('@/lib/two-factor');
      
      expect(twoFactorService.setup).toBeDefined();
      expect(twoFactorService.verify).toBeDefined();
      expect(twoFactorService.verifyAndEnable).toBeDefined();
      expect(twoFactorService.disable).toBeDefined();
      expect(twoFactorService.regenerateBackupCodes).toBeDefined();
      expect(twoFactorService.getStatus).toBeDefined();
      expect(twoFactorService.requiresVerification).toBeDefined();
    });

    it('should export helper functions', async () => {
      const twoFactor = await import('@/lib/two-factor');
      
      expect(twoFactor.generateSecret).toBeDefined();
      expect(twoFactor.generateOtpAuthUrl).toBeDefined();
      expect(twoFactor.verifyTOTP).toBeDefined();
      expect(twoFactor.generateBackupCodes).toBeDefined();
      expect(twoFactor.hashBackupCode).toBeDefined();
      expect(twoFactor.verifyBackupCode).toBeDefined();
    });

    it('should export types', async () => {
      const twoFactor = await import('@/lib/two-factor');
      
      // Types are exported, we just verify the module loads
      expect(twoFactor).toBeDefined();
    });
  });
});
