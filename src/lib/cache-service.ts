// =============================================================================
// ConstrutorPro - Cache Service
// Serviço de cache para otimização de performance (Redis ou in-memory)
// =============================================================================

// =============================================================================
// Types
// =============================================================================

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  prefix?: string // Key prefix for namespacing
  compress?: boolean // Enable compression for large values
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  keys: number
  memory: number
}

export interface CacheEntry<T> {
  data: T
  cachedAt: Date
  expiresAt: Date
  version: string
}

// =============================================================================
// In-Memory Cache
// =============================================================================

export class MemoryCache {
  private cache = new Map<string, { data: any; expiresAt: number }>()
  private hits = 0
  private misses = 0

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.misses++
      return null
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.misses++
      return null
    }
    
    this.hits++
    return entry.data as T
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + ttl * 1000,
    })
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }

  async deletePattern(pattern: string): Promise<number> {
    let deleted = 0
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        deleted++
      }
    }
    
    return deleted
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  getStats(): { hits: number; misses: number; keys: number; memory: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      keys: this.cache.size,
      memory: this.cache.size * 1024, // Rough estimate
    }
  }

  cleanup(): number {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    return cleaned
  }
}

// =============================================================================
// Cache Service
// =============================================================================

class CacheService {
  private memory: MemoryCache
  private defaultTTL: number
  private keyPrefix: string
  private version: string

  constructor() {
    this.memory = new MemoryCache()
    this.defaultTTL = parseInt(process.env.CACHE_TTL || '3600', 10) // 1 hour default
    this.keyPrefix = process.env.CACHE_PREFIX || 'construtorpro:'
    this.version = '1.0.0'
    
    // Run cleanup every 5 minutes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.memory.cleanup()
      }, 5 * 60 * 1000)
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const p = prefix || this.keyPrefix
    return `${p}${key}`
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.prefix)
    return this.memory.get<T>(fullKey)
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options?.prefix)
    const ttl = options?.ttl || this.defaultTTL
    await this.memory.set(fullKey, value, ttl)
  }

  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key, options)
    
    if (cached !== null) {
      return cached
    }
    
    const value = await callback()
    await this.set(key, value, options)
    
    return value
  }

  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.prefix)
    return this.memory.delete(fullKey)
  }

  async deletePattern(pattern: string, options?: CacheOptions): Promise<number> {
    const fullPattern = this.buildKey(pattern, options?.prefix)
    return this.memory.deletePattern(fullPattern)
  }

  async clear(): Promise<void> {
    await this.memory.clear()
  }

  async getStats(): Promise<CacheStats> {
    const stats = this.memory.getStats()
    return {
      ...stats,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
    }
  }

  async invalidateEntity(entity: string, id?: string): Promise<void> {
    const patterns = id
      ? [`*:${entity}:${id}*`, `*:${entity}:*:${id}*`]
      : [`*:${entity}:*`]
    
    for (const pattern of patterns) {
      // Apply default prefix to the pattern
      await this.deletePattern(pattern, { prefix: this.keyPrefix })
    }
  }

  static keys = {
    project: (id: string) => `project:${id}`,
    projectList: (companyId: string, page?: number) => 
      `projects:${companyId}:${page || 'all'}`,
    budget: (id: string) => `budget:${id}`,
    budgetList: (companyId: string, page?: number) => 
      `budgets:${companyId}:${page || 'all'}`,
    user: (id: string) => `user:${id}`,
    userPermissions: (userId: string) => `user:${userId}:permissions`,
    company: (id: string) => `company:${id}`,
    companyPlanLimits: (companyId: string) => `company:${companyId}:limits`,
    materials: (companyId: string, page?: number) => 
      `materials:${companyId}:${page || 'all'}`,
    compositions: (companyId: string, page?: number) => 
      `compositions:${companyId}:${page || 'all'}`,
    dailyLog: (projectId: string, date: string) => 
      `dailylog:${projectId}:${date}`,
    financialSummary: (companyId: string, month: string) => 
      `financial:${companyId}:${month}`,
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const cache = new CacheService()

// =============================================================================
// Decorator for caching method results
// =============================================================================

export function Cached(ttl: number = 3600, keyPrefix?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const key = `${keyPrefix || target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`
      
      const cached = await cache.get(key)
      
      if (cached !== null) {
        return cached
      }
      
      const result = await originalMethod.apply(this, args)
      await cache.set(key, result, { ttl })
      
      return result
    }

    return descriptor
  }
}
