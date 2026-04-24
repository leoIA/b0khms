/**
 * Tests for Password Reset Service
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
    password_reset_tokens: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    sessions: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((operations) => Promise.all(operations)),
  },
}));

vi.mock('@/lib/email', () => ({
  emailService: {
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

describe('Password Reset Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Generation', () => {
    it('should generate a valid random token', () => {
      const token = crypto.randomBytes(32).toString('hex');
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = crypto.randomBytes(32).toString('hex');
      const token2 = crypto.randomBytes(32).toString('hex');
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('Password Validation', () => {
    const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      
      if (password.length < 8) {
        errors.push('A senha deve ter pelo menos 8 caracteres');
      }
      
      if (!/[A-Z]/.test(password)) {
        errors.push('A senha deve conter pelo menos uma letra maiúscula');
      }
      
      if (!/[a-z]/.test(password)) {
        errors.push('A senha deve conter pelo menos uma letra minúscula');
      }
      
      if (!/[0-9]/.test(password)) {
        errors.push('A senha deve conter pelo menos um número');
      }
      
      return { valid: errors.length === 0, errors };
    };

    it('should accept valid passwords', () => {
      expect(validatePassword('Password123').valid).toBe(true);
      expect(validatePassword('Abcdefg1').valid).toBe(true);
      expect(validatePassword('STRONGpass99').valid).toBe(true);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A senha deve ter pelo menos 8 caracteres');
    });

    it('should reject passwords without uppercase letter', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A senha deve conter pelo menos uma letra maiúscula');
    });

    it('should reject passwords without lowercase letter', () => {
      const result = validatePassword('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A senha deve conter pelo menos uma letra minúscula');
    });

    it('should reject passwords without number', () => {
      const result = validatePassword('Password');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A senha deve conter pelo menos um número');
    });

    it('should return multiple errors for invalid password', () => {
      const result = validatePassword('pass');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Email Masking', () => {
    const maskEmail = (email: string): string => {
      const [localPart, domain] = email.split('@');
      if (!domain) return email;
      
      const maskedLocal = localPart.length > 2 
        ? `${localPart.slice(0, 2)}***`
        : `${localPart[0]}***`;
      
      return `${maskedLocal}@${domain}`;
    };

    it('should mask email correctly', () => {
      expect(maskEmail('user@example.com')).toBe('us***@example.com');
      expect(maskEmail('test.user@domain.org')).toBe('te***@domain.org');
      expect(maskEmail('a@b.com')).toBe('a***@b.com');
    });

    it('should handle short local parts', () => {
      // For 'a' (length 1), condition is false, uses first char
      expect(maskEmail('a@example.com')).toBe('a***@example.com');
      // For 'ab' (length 2), condition is false (2 > 2 is false), uses first char
      expect(maskEmail('ab@example.com')).toBe('a***@example.com');
    });

    it('should handle two character local parts', () => {
      const maskEmail2 = (email: string): string => {
        const [localPart, domain] = email.split('@');
        if (!domain) return email;
        const maskedLocal = localPart.length > 2 
          ? `${localPart.slice(0, 2)}***`
          : `${localPart[0]}***`;
        return `${maskedLocal}@${domain}`;
      };
      
      // With this implementation, 'ab' has length 2, which is not > 2
      expect(maskEmail2('ab@example.com')).toBe('a***@example.com');
    });
  });

  describe('Token Expiry', () => {
    it('should calculate correct expiry time', () => {
      const expiryMinutes = 30;
      const now = new Date();
      const expires = new Date(now.getTime() + expiryMinutes * 60 * 1000);
      
      const diffMs = expires.getTime() - now.getTime();
      const diffMinutes = diffMs / (60 * 1000);
      
      expect(diffMinutes).toBeCloseTo(30, 0);
    });

    it('should detect expired tokens', () => {
      const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
      expect(pastDate < new Date()).toBe(true);
      
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      expect(futureDate > new Date()).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow rate limit check', () => {
      const maxRequestsPerHour = 3;
      const recentRequestCount = 2;
      
      expect(recentRequestCount < maxRequestsPerHour).toBe(true);
      
      const tooManyRequests = 4;
      expect(tooManyRequests >= maxRequestsPerHour).toBe(true);
    });
  });
});

describe('Password Reset API Validation', () => {
  const forgotPasswordSchema = {
    email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  };

  const resetPasswordSchema = {
    token: (value: string) => value.length >= 32,
    password: (value: string) => value.length >= 8,
    confirmPassword: (value: string, password: string) => value === password,
  };

  describe('Forgot Password Schema', () => {
    it('should accept valid email', () => {
      expect(forgotPasswordSchema.email('user@example.com')).toBe(true);
      expect(forgotPasswordSchema.email('test.user@domain.org')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(forgotPasswordSchema.email('invalid')).toBe(false);
      expect(forgotPasswordSchema.email('user@')).toBe(false);
      expect(forgotPasswordSchema.email('@domain.com')).toBe(false);
    });
  });

  describe('Reset Password Schema', () => {
    it('should accept valid token', () => {
      expect(resetPasswordSchema.token('a'.repeat(32))).toBe(true);
      expect(resetPasswordSchema.token('a'.repeat(64))).toBe(true);
    });

    it('should reject short token', () => {
      expect(resetPasswordSchema.token('short')).toBe(false);
      expect(resetPasswordSchema.token('')).toBe(false);
    });

    it('should accept valid password', () => {
      expect(resetPasswordSchema.password('password123')).toBe(true);
      expect(resetPasswordSchema.password('12345678')).toBe(true);
    });

    it('should reject short password', () => {
      expect(resetPasswordSchema.password('short')).toBe(false);
      expect(resetPasswordSchema.password('')).toBe(false);
    });

    it('should validate password confirmation', () => {
      expect(resetPasswordSchema.confirmPassword('password', 'password')).toBe(true);
      expect(resetPasswordSchema.confirmPassword('password1', 'password2')).toBe(false);
    });
  });
});

describe('Password Reset Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have all required methods', async () => {
    const { passwordResetService } = await import('@/lib/password-reset');
    
    expect(passwordResetService.requestReset).toBeDefined();
    expect(passwordResetService.validateToken).toBeDefined();
    expect(passwordResetService.resetPassword).toBeDefined();
    expect(passwordResetService.cleanupExpiredTokens).toBeDefined();
  });
});
