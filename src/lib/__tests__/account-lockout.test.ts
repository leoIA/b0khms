// =============================================================================
// ConstrutorPro - Unit Tests: Account Lockout Service
// Testes para bloqueio de conta após falhas de login
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryAccountLockout, ACCOUNT_LOCKOUT_PRESETS } from '../account-lockout';

// =============================================================================
// Tests for InMemoryAccountLockout
// =============================================================================

describe('Account Lockout Service', () => {
  let lockout: InMemoryAccountLockout;

  beforeEach(() => {
    lockout = new InMemoryAccountLockout({
      maxAttempts: 5,
      lockoutDurations: [1800000, 3600000, 86400000], // 30min, 1h, 24h
      attemptWindowMs: 3600000, // 1 hour
      keyPrefix: 'test',
    });
  });

  afterEach(() => {
    lockout.stop();
    lockout.clear();
  });

  describe('Failed Attempt Tracking', () => {
    it('should track failed attempts', () => {
      const result = lockout.recordFailure('user@test.com');
      
      expect(result.locked).toBe(false);
      expect(result.remaining).toBe(4);
    });

    it('should decrement remaining attempts', () => {
      for (let i = 5; i > 0; i--) {
        const result = lockout.recordFailure('user@test.com');
        expect(result.remaining).toBe(i - 1);
      }
    });

    it('should lock after max attempts', () => {
      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        lockout.recordFailure('user@test.com');
      }
      
      // 6th should lock
      const result = lockout.recordFailure('user@test.com');
      
      expect(result.locked).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.lockedUntil).toBeDefined();
    });

    it('should track different users separately', () => {
      // 5 failures for user1
      for (let i = 0; i < 5; i++) {
        lockout.recordFailure('user1@test.com');
      }
      
      // user1 should be locked
      expect(lockout.isLocked('user1@test.com').locked).toBe(true);
      
      // user2 should not be locked
      expect(lockout.isLocked('user2@test.com').locked).toBe(false);
    });

    it('should normalize email addresses', () => {
      // Record failures with uppercase
      for (let i = 0; i < 5; i++) {
        lockout.recordFailure('USER@TEST.COM');
      }
      
      // Check lowercase email - should be locked
      expect(lockout.isLocked('user@test.com').locked).toBe(true);
    });
  });

  describe('Lockout Durations', () => {
    it('should apply first lockout duration (30 min)', () => {
      // Trigger lockout (6 failures)
      for (let i = 0; i < 6; i++) {
        lockout.recordFailure('user@test.com');
      }
      
      const status = lockout.isLocked('user@test.com');
      expect(status.locked).toBe(true);
      expect(status.lockedUntil).toBeGreaterThan(Date.now());
    });

    it('should return lockout duration', () => {
      // Trigger lockout
      for (let i = 0; i < 6; i++) {
        lockout.recordFailure('user@test.com');
      }
      
      const result = lockout.recordFailure('user@test.com');
      
      expect(result.lockoutDuration).toBeDefined();
      expect(result.lockoutDuration).toBeGreaterThan(0);
    });
  });

  describe('Successful Login', () => {
    it('should clear attempts on successful login', () => {
      // Record some failures
      for (let i = 0; i < 3; i++) {
        lockout.recordFailure('user@test.com');
      }
      
      // Successful login
      lockout.recordSuccess('user@test.com');
      
      // Should be cleared
      expect(lockout.getStatus('test:user@test.com')).toBeUndefined();
    });

    it('should unlock after successful login', () => {
      // Lock the account
      for (let i = 0; i < 6; i++) {
        lockout.recordFailure('user@test.com');
      }
      
      expect(lockout.isLocked('user@test.com').locked).toBe(true);
      
      // Successful login
      lockout.recordSuccess('user@test.com');
      
      expect(lockout.isLocked('user@test.com').locked).toBe(false);
    });
  });

  describe('Manual Unlock', () => {
    it('should unlock account manually', () => {
      // Lock the account
      for (let i = 0; i < 6; i++) {
        lockout.recordFailure('user@test.com');
      }
      
      expect(lockout.isLocked('user@test.com').locked).toBe(true);
      
      // Manual unlock
      lockout.unlock('user@test.com');
      
      expect(lockout.isLocked('user@test.com').locked).toBe(false);
    });
  });

  describe('Lock Status Check', () => {
    it('should return correct lock status', () => {
      // Not locked initially
      expect(lockout.isLocked('user@test.com').locked).toBe(false);
      
      // Lock it
      for (let i = 0; i < 6; i++) {
        lockout.recordFailure('user@test.com');
      }
      
      const { locked, lockedUntil } = lockout.isLocked('user@test.com');
      
      expect(locked).toBe(true);
      expect(lockedUntil).toBeDefined();
      expect(lockedUntil).toBeGreaterThan(Date.now());
    });

    it('should return lock expiration time', () => {
      // Lock the account
      for (let i = 0; i < 6; i++) {
        lockout.recordFailure('user@test.com');
      }
      
      const { lockedUntil } = lockout.isLocked('user@test.com');
      
      // Should be locked for at least 29 minutes
      const minExpected = Date.now() + 29 * 60 * 1000;
      expect(lockedUntil).toBeGreaterThan(minExpected);
    });

    it('should return remaining attempts', () => {
      // Record 2 failures
      lockout.recordFailure('user@test.com');
      lockout.recordFailure('user@test.com');
      
      const status = lockout.isLocked('user@test.com');
      
      expect(status.remainingAttempts).toBe(3);
      expect(status.failedAttempts).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty identifier', () => {
      const result = lockout.recordFailure('');
      expect(result.locked).toBe(false);
    });

    it('should handle special characters in identifier', () => {
      const result = lockout.recordFailure('user+test@example.com');
      expect(result.locked).toBe(false);
    });

    it('should handle concurrent failures gracefully', () => {
      // Simulate rapid failures
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(lockout.recordFailure('user@test.com'));
      }
      
      // All should eventually show locked
      expect(results[results.length - 1].locked).toBe(true);
    });
  });
});

describe('Account Lockout Configuration', () => {
  it('should have correct default preset', () => {
    expect(ACCOUNT_LOCKOUT_PRESETS.default.maxAttempts).toBe(5);
    expect(ACCOUNT_LOCKOUT_PRESETS.default.lockoutDurations).toHaveLength(4);
  });

  it('should have correct admin preset', () => {
    expect(ACCOUNT_LOCKOUT_PRESETS.admin.maxAttempts).toBe(3);
    expect(ACCOUNT_LOCKOUT_PRESETS.admin.lockoutDurations).toHaveLength(3);
  });

  it('should work with custom max attempts', () => {
    const customLockout = new InMemoryAccountLockout({
      maxAttempts: 3,
      lockoutDurations: [60000],
      attemptWindowMs: 3600000,
      keyPrefix: 'custom',
    });
    
    // 3 failures should lock
    for (let i = 0; i < 3; i++) {
      customLockout.recordFailure('user@test.com');
    }
    
    expect(customLockout.isLocked('user@test.com').locked).toBe(true);
    customLockout.stop();
  });

  it('should work with custom lockout durations', () => {
    const shortLockout = new InMemoryAccountLockout({
      maxAttempts: 2,
      lockoutDurations: [1000], // 1 second
      attemptWindowMs: 3600000,
      keyPrefix: 'short',
    });
    
    // Lock the account
    for (let i = 0; i < 3; i++) {
      shortLockout.recordFailure('user@test.com');
    }
    
    const { lockedUntil } = shortLockout.isLocked('user@test.com');
    expect(lockedUntil).toBeLessThanOrEqual(Date.now() + 1100);
    shortLockout.stop();
  });
});
