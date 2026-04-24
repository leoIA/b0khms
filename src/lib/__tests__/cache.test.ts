// =============================================================================
// ConstrutorPro - Cache Service Tests
// Unit tests for caching functionality
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheTTL, CacheKeys, cache } from '../cache';

// Mock environment for testing
vi.stubEnv('NODE_ENV', 'test');

describe('Cache Service', () => {
  beforeEach(() => {
    // Clear cache before each test
    vi.clearAllMocks();
  });

  describe('CacheTTL constants', () => {
    it('should have correct TTL values', () => {
      expect(CacheTTL.SHORT).toBe(30);
      expect(CacheTTL.MEDIUM).toBe(300);
      expect(CacheTTL.LONG).toBe(900);
      expect(CacheTTL.EXTENDED).toBe(3600);
      expect(CacheTTL.DAILY).toBe(86400);
    });

    it('should have specific entity TTL values', () => {
      expect(CacheTTL.DASHBOARD_STATS).toBe(60);
      expect(CacheTTL.PROJECTS_LIST).toBe(300);
      expect(CacheTTL.COMPOSITIONS).toBe(1800);
      expect(CacheTTL.MATERIALS).toBe(1800);
    });
  });

  describe('CacheKeys factory', () => {
    const companyId = 'company-123';
    const userId = 'user-456';
    const projectId = 'project-789';

    it('should generate dashboard cache key', () => {
      const key = CacheKeys.userDashboard(userId, companyId);
      expect(key).toBe(`dashboard:${companyId}:${userId}`);
    });

    it('should generate user permissions cache key', () => {
      const key = CacheKeys.userPermissions(userId);
      expect(key).toBe(`permissions:${userId}`);
    });

    it('should generate company projects cache key without filters', () => {
      const key = CacheKeys.companyProjects(companyId);
      expect(key).toBe(`projects:${companyId}`);
    });

    it('should generate company projects cache key with filters', () => {
      const key = CacheKeys.companyProjects(companyId, 'active');
      expect(key).toBe(`projects:${companyId}:active`);
    });

    it('should generate project detail cache key', () => {
      const key = CacheKeys.companyProject(companyId, projectId);
      expect(key).toBe(`project:${companyId}:${projectId}`);
    });

    it('should generate clients cache key', () => {
      const key = CacheKeys.companyClients(companyId);
      expect(key).toBe(`clients:${companyId}`);
    });

    it('should generate suppliers cache key', () => {
      const key = CacheKeys.companySuppliers(companyId);
      expect(key).toBe(`suppliers:${companyId}`);
    });

    it('should generate materials cache key', () => {
      const key = CacheKeys.companyMaterials(companyId);
      expect(key).toBe(`materials:${companyId}`);
    });

    it('should generate compositions cache key', () => {
      const key = CacheKeys.companyCompositions(companyId);
      expect(key).toBe(`compositions:${companyId}`);
    });

    it('should generate alerts cache key', () => {
      const key = CacheKeys.companyAlerts(companyId);
      expect(key).toBe(`alerts:${companyId}`);
    });

    it('should generate transactions cache key with filters', () => {
      const key = CacheKeys.companyTransactions(companyId, '2024-01');
      expect(key).toBe(`transactions:${companyId}:2024-01`);
    });

    it('should generate SINAPI compositions cache key', () => {
      const key = CacheKeys.sinapiCompositions('2024-01');
      expect(key).toBe(`sinapi:2024-01`);
    });

    it('should generate rate limit cache key', () => {
      const key = CacheKeys.rateLimit('192.168.1.1');
      expect(key).toBe(`ratelimit:192.168.1.1`);
    });

    it('should generate session cache key', () => {
      const key = CacheKeys.session('token-abc123');
      expect(key).toBe(`session:token-abc123`);
    });
  });

  describe('Cache operations', () => {
    it('should set and get a value', async () => {
      const key = 'test-key';
      const value = { name: 'test', data: [1, 2, 3] };

      await cache.set(key, value, CacheTTL.SHORT);
      const result = await cache.get<typeof value>(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      const key = 'test-delete-key';
      await cache.set(key, 'value', CacheTTL.SHORT);

      const deleted = await cache.delete(key);
      expect(deleted).toBe(true);

      const result = await cache.get(key);
      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test-exists-key';
      await cache.set(key, 'value', CacheTTL.SHORT);

      const exists = await cache.exists(key);
      expect(exists).toBe(true);

      await cache.delete(key);
      const notExists = await cache.exists(key);
      expect(notExists).toBe(false);
    });

    it('should increment a counter', async () => {
      const key = 'test-counter';
      await cache.delete(key);

      const result1 = await cache.incr(key);
      expect(result1).toBe(1);

      const result2 = await cache.incr(key);
      expect(result2).toBe(2);

      const result3 = await cache.incr(key);
      expect(result3).toBe(3);
    });

    it('should use getOrSet to get cached or compute value', async () => {
      const key = 'test-get-or-set';
      let callCount = 0;

      const factory = vi.fn(async () => {
        callCount++;
        return { computed: true, callCount };
      });

      // First call should compute
      const result1 = await cache.getOrSet(key, factory, CacheTTL.SHORT);
      expect(result1).toEqual({ computed: true, callCount: 1 });
      expect(factory).toHaveBeenCalledTimes(1);

      // Second call should return cached
      const result2 = await cache.getOrSet(key, factory, CacheTTL.SHORT);
      expect(result2).toEqual({ computed: true, callCount: 1 });
      expect(factory).toHaveBeenCalledTimes(1); // Not called again

      // Clear and call again
      await cache.delete(key);
      const result3 = await cache.getOrSet(key, factory, CacheTTL.SHORT);
      expect(result3).toEqual({ computed: true, callCount: 2 });
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should delete keys by pattern', async () => {
      await cache.set('test-pattern-1', 'value1', CacheTTL.SHORT);
      await cache.set('test-pattern-2', 'value2', CacheTTL.SHORT);
      await cache.set('other-key', 'value3', CacheTTL.SHORT);

      const count = await cache.deletePattern('test-pattern-*');
      expect(count).toBeGreaterThanOrEqual(2);

      expect(await cache.get('test-pattern-1')).toBeNull();
      expect(await cache.get('test-pattern-2')).toBeNull();
      expect(await cache.get('other-key')).toBe('value3');
    });
  });
});
