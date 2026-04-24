// =============================================================================
// ConstrutorPro - Unit Tests: Rate Limiter Service
// Testes para limitação de requisições por IP e usuário
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryRateLimiter, RATE_LIMIT_PRESETS, getRateLimitHeaders } from '../rate-limiter';

// =============================================================================
// Tests for InMemoryRateLimiter
// =============================================================================

describe('Rate Limiter', () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter({
      maxRequests: 5,
      windowMs: 60000,
      blockDurationMs: 300000,
      keyPrefix: 'test',
    });
  });

  afterEach(() => {
    limiter.stop();
    limiter.clear();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests under the limit', () => {
      const result = limiter.check('192.168.1.1');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.blocked).toBeUndefined();
    });

    it('should track remaining requests correctly', () => {
      for (let i = 5; i > 0; i--) {
        const result = limiter.check('192.168.1.1');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(i - 1);
      }
    });

    it('should block when limit is exceeded', () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        limiter.check('192.168.1.1');
      }
      
      // 6th request should be blocked
      const result = limiter.check('192.168.1.1');
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.blocked).toBe(true);
    });

    it('should track different IPs separately', () => {
      // Make 5 requests from IP1
      for (let i = 0; i < 5; i++) {
        limiter.check('192.168.1.1');
      }
      
      // IP1 should be blocked
      expect(limiter.check('192.168.1.1').allowed).toBe(false);
      
      // IP2 should still be allowed
      expect(limiter.check('192.168.1.2').allowed).toBe(true);
    });
  });

  describe('Blocking Mechanism', () => {
    it('should set blocked status when limit exceeded', () => {
      // Exceed limit (make 6 requests)
      for (let i = 0; i < 6; i++) {
        limiter.check('192.168.1.1');
      }
      
      // Verify the next request shows blocked
      const result = limiter.check('192.168.1.1');
      
      expect(result.blocked).toBe(true);
      expect(result.blockedUntil).toBeDefined();
    });

    it('should return blockedUntil timestamp', () => {
      // Exceed limit
      for (let i = 0; i < 6; i++) {
        limiter.check('192.168.1.1');
      }
      
      const result = limiter.check('192.168.1.1');
      
      expect(result.blockedUntil).toBeDefined();
      expect(result.blockedUntil).toBeGreaterThan(Date.now());
    });

    it('should return retryAfter in seconds', () => {
      // Exceed limit
      for (let i = 0; i < 6; i++) {
        limiter.check('192.168.1.1');
      }
      
      const result = limiter.check('192.168.1.1');
      
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset rate limit for an IP', () => {
      // Exceed limit
      for (let i = 0; i < 6; i++) {
        limiter.check('192.168.1.1');
      }
      
      expect(limiter.check('192.168.1.1').allowed).toBe(false);
      
      // Reset
      limiter.reset('192.168.1.1');
      
      // Should be allowed again
      expect(limiter.check('192.168.1.1').allowed).toBe(true);
    });

    it('should not affect other IPs when resetting', () => {
      // Exceed limit for IP1
      for (let i = 0; i < 6; i++) {
        limiter.check('192.168.1.1');
      }
      
      // Exceed limit for IP2
      for (let i = 0; i < 6; i++) {
        limiter.check('192.168.1.2');
      }
      
      // Reset IP1
      limiter.reset('192.168.1.1');
      
      // IP1 should be allowed
      expect(limiter.check('192.168.1.1').allowed).toBe(true);
      
      // IP2 should still be blocked
      expect(limiter.check('192.168.1.2').allowed).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty IP string', () => {
      const result = limiter.check('');
      
      expect(result.allowed).toBe(true);
    });

    it('should handle IPv6 addresses', () => {
      const result = limiter.check('::1');
      
      expect(result.allowed).toBe(true);
    });

    it('should handle IP with port', () => {
      const result = limiter.check('192.168.1.1:8080');
      
      expect(result.allowed).toBe(true);
    });
  });
});

describe('Rate Limiter Configuration', () => {
  it('should have correct auth preset', () => {
    expect(RATE_LIMIT_PRESETS.auth.maxRequests).toBe(5);
    expect(RATE_LIMIT_PRESETS.auth.windowMs).toBe(60000);
    expect(RATE_LIMIT_PRESETS.auth.blockDurationMs).toBe(900000);
  });

  it('should have correct api preset', () => {
    expect(RATE_LIMIT_PRESETS.api.maxRequests).toBe(100);
    expect(RATE_LIMIT_PRESETS.api.windowMs).toBe(60000);
  });

  it('should have correct passwordReset preset', () => {
    expect(RATE_LIMIT_PRESETS.passwordReset.maxRequests).toBe(3);
    expect(RATE_LIMIT_PRESETS.passwordReset.windowMs).toBe(3600000);
    expect(RATE_LIMIT_PRESETS.passwordReset.blockDurationMs).toBe(86400000);
  });
});

describe('Rate Limiter Helper Functions', () => {
  it('should generate correct rate limit headers', () => {
    const result = {
      allowed: true,
      remaining: 95,
      resetAt: Date.now() + 60000,
    };
    
    const headers = getRateLimitHeaders(result, 100);
    
    expect(headers['X-RateLimit-Limit']).toBe('100');
    expect(headers['X-RateLimit-Remaining']).toBe('95');
    expect(parseInt(headers['X-RateLimit-Reset'])).toBeGreaterThan(0);
  });
});
