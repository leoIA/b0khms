// =============================================================================
// ConstrutorPro - Cache Service (Memory + Optional Redis)
// High-performance caching layer for frequently accessed data
// =============================================================================

/**
 * Cache configuration and TTL (Time To Live) values in seconds
 */
export const CacheTTL = {
  // Short-lived cache (30 seconds) - for rapidly changing data
  SHORT: 30,
  
  // Medium cache (5 minutes) - for moderately changing data
  MEDIUM: 300,
  
  // Long cache (15 minutes) - for stable data
  LONG: 900,
  
  // Extended cache (1 hour) - for rarely changing data
  EXTENDED: 3600,
  
  // Daily cache (24 hours) - for static data
  DAILY: 86400,
  
  // Specific entity caches
  DASHBOARD_STATS: 60,        // 1 minute - dashboard needs fresh data
  PROJECTS_LIST: 300,         // 5 minutes
  PROJECT_DETAIL: 600,        // 10 minutes
  COMPOSITIONS: 1800,         // 30 minutes - compositions change rarely
  MATERIALS: 1800,            // 30 minutes
  SUPPLIERS: 1800,            // 30 minutes
  CLIENTS: 1800,              // 30 minutes
  BUDGETS: 300,               // 5 minutes
  ALERTS: 60,                 // 1 minute
  USER_PERMISSIONS: 900,      // 15 minutes
  COMPANY_SETTINGS: 3600,     // 1 hour
} as const;

/**
 * Cache key prefix factory for namespacing
 */
export const CacheKeys = {
  // User-specific data
  userDashboard: (userId: string, companyId: string) => `dashboard:${companyId}:${userId}`,
  userPermissions: (userId: string) => `permissions:${userId}`,
  
  // Company-scoped data
  companyProjects: (companyId: string, filters?: string) => 
    `projects:${companyId}${filters ? `:${filters}` : ''}`,
  companyProject: (companyId: string, projectId: string) => 
    `project:${companyId}:${projectId}`,
  companyClients: (companyId: string) => `clients:${companyId}`,
  companySuppliers: (companyId: string) => `suppliers:${companyId}`,
  companyMaterials: (companyId: string) => `materials:${companyId}`,
  companyCompositions: (companyId: string) => `compositions:${companyId}`,
  companyBudgets: (companyId: string) => `budgets:${companyId}`,
  companyAlerts: (companyId: string) => `alerts:${companyId}`,
  companyTransactions: (companyId: string, filters?: string) => 
    `transactions:${companyId}${filters ? `:${filters}` : ''}`,
  
  // Static/system data
  sinapiCompositions: (month: string) => `sinapi:${month}`,
  sinapiMaterials: (month: string) => `sinapi:materials:${month}`,
  
  // Rate limiting
  rateLimit: (key: string) => `ratelimit:${key}`,
  
  // Session data
  session: (token: string) => `session:${token}`,
} as const;

/**
 * Memory-based LRU cache implementation
 */
class MemoryCache {
  private cache = new Map<string, { value: unknown; expires: number }>();
  private maxSize = 1000;
  private cleanupInterval: ReturnType<typeof setInterval>;
  
  constructor() {
    // Clean expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }
  
  set<T>(key: string, value: T, ttl: number): void {
    // LRU eviction if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  deletePattern(pattern: string): number {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
  
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
  
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

/**
 * Cache adapter interface
 */
interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  deletePattern(pattern: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  incr(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<boolean>;
}

/**
 * Memory adapter for development/fallback
 */
class MemoryAdapter implements CacheAdapter {
  private cache: MemoryCache;
  
  constructor() {
    this.cache = new MemoryCache();
  }
  
  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }
  
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.cache.set(key, value, ttl);
  }
  
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }
  
  async deletePattern(pattern: string): Promise<number> {
    return this.cache.deletePattern(pattern);
  }
  
  async exists(key: string): Promise<boolean> {
    return this.cache.get(key) !== null;
  }
  
  async incr(key: string): Promise<number> {
    const current = this.cache.get<number>(key) || 0;
    const newValue = current + 1;
    this.cache.set(key, newValue, 3600); // Default 1 hour
    return newValue;
  }
  
  async expire(key: string, ttl: number): Promise<boolean> {
    const value = this.cache.get(key);
    if (value === null) return false;
    this.cache.set(key, value, ttl);
    return true;
  }
  
  getStats() {
    return this.cache.getStats();
  }
}

/**
 * Unified cache service with memory backend
 * Redis support can be added via a separate adapter when needed
 */
class CacheService implements CacheAdapter {
  private adapter: MemoryAdapter;
  
  constructor() {
    this.adapter = new MemoryAdapter();
  }
  
  async get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(key);
  }
  
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    return this.adapter.set(key, value, ttl);
  }
  
  async delete(key: string): Promise<boolean> {
    return this.adapter.delete(key);
  }
  
  async deletePattern(pattern: string): Promise<number> {
    return this.adapter.deletePattern(pattern);
  }
  
  async exists(key: string): Promise<boolean> {
    return this.adapter.exists(key);
  }
  
  async incr(key: string): Promise<number> {
    return this.adapter.incr(key);
  }
  
  async expire(key: string, ttl: number): Promise<boolean> {
    return this.adapter.expire(key, ttl);
  }
  
  /**
   * Get or set pattern - returns cached value or executes factory and caches result
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
  
  /**
   * Invalidate all cache entries for a company
   */
  async invalidateCompanyCache(companyId: string): Promise<number> {
    return this.deletePattern(`*:${companyId}*`);
  }
  
  /**
   * Invalidate specific entity cache
   */
  async invalidateEntity(
    entityType: 'projects' | 'clients' | 'suppliers' | 'materials' | 'compositions' | 'budgets' | 'alerts',
    companyId: string
  ): Promise<number> {
    return this.deletePattern(`${entityType}:${companyId}*`);
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return this.adapter.getStats();
  }
}

// Export singleton instance
export const cache = new CacheService();

// Export types
export type { CacheAdapter };
