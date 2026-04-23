/**
 * Serviço de Cache Redis para ConstrutorPro
 * 
 * Sistema completo de cache com suporte a:
 * - Redis para produção (cluster/sentinel)
 * - Cache em memória para desenvolvimento
 * - Estratégias de invalidação
 * - Cache de sessões
 * - Métricas e monitoramento
 */

import { createClient, RedisClientType } from 'redis';

// Tipos de cache disponíveis
export type CacheProvider = 'redis' | 'memory';

// Configuração de TTL (em segundos)
export const CACHE_TTL = {
  SHORT: 60,              // 1 minuto
  MEDIUM: 300,            // 5 minutos
  LONG: 1800,             // 30 minutos
  HOUR: 3600,             // 1 hora
  DAY: 86400,             // 24 horas
  WEEK: 604800,           // 7 dias
  SESSION: 7200,          // 2 horas (sessão)
};

// Chaves de cache do sistema
export const CACHE_KEYS = {
  // Projetos
  PROJECT_LIST: (companyId: string) => `projects:list:${companyId}`,
  PROJECT_DETAIL: (id: string) => `projects:detail:${id}`,
  PROJECT_EVM: (id: string) => `projects:evm:${id}`,
  PROJECT_BUDGET_VS_ACTUAL: (id: string) => `projects:bva:${id}`,
  
  // Orçamentos
  BUDGET_LIST: (companyId: string) => `budgets:list:${companyId}`,
  BUDGET_DETAIL: (id: string) => `budgets:detail:${id}`,
  BUDGET_VERSIONS: (id: string) => `budgets:versions:${id}`,
  BUDGET_ABC: (id: string) => `budgets:abc:${id}`,
  
  // SINAPI
  SINAPI_COMPOSICOES: (companyId: string) => `sinapi:composicoes:${companyId}`,
  SINAPI_INSUMOS: (companyId: string) => `sinapi:insumos:${companyId}`,
  SINAPI_IMPORTS: (companyId: string) => `sinapi:imports:${companyId}`,
  
  // Configurações
  BDI_CONFIG: (companyId: string) => `config:bdi:${companyId}`,
  ENCARGOS_CONFIG: (companyId: string) => `config:encargos:${companyId}`,
  AI_CONFIG: (companyId: string) => `config:ai:${companyId}`,
  PAYMENT_CONFIG: (companyId: string) => `config:payment:${companyId}`,
  
  // Dashboard
  DASHBOARD_STATS: (companyId: string) => `dashboard:stats:${companyId}`,
  DASHBOARD_ALERTS: (companyId: string) => `dashboard:alerts:${companyId}`,
  DASHBOARD_KPIS: (companyId: string) => `dashboard:kpis:${companyId}`,
  
  // Patrimônio
  PATRIMONIO_LIST: (companyId: string) => `patrimonio:list:${companyId}`,
  PATRIMONIO_DETAIL: (id: string) => `patrimonio:detail:${id}`,
  PATRIMONIO_RELATORIO: (companyId: string) => `patrimonio:relatorio:${companyId}`,
  PATRIMONIO_DEPRECIACAO: (id: string) => `patrimonio:dep:${id}`,
  
  // Compras
  SUPPLIERS_LIST: (companyId: string) => `suppliers:list:${companyId}`,
  PURCHASE_ORDERS: (companyId: string) => `purchases:${companyId}`,
  PURCHASE_ORDER_DETAIL: (id: string) => `purchases:detail:${id}`,
  
  // Financeiro
  TRANSACTIONS: (companyId: string) => `transactions:${companyId}`,
  FINANCIAL_SUMMARY: (companyId: string) => `financial:summary:${companyId}`,
  INVOICES: (companyId: string) => `invoices:${companyId}`,
  
  // Usuários e Sessões
  USER_SESSION: (userId: string) => `user:session:${userId}`,
  USER_PERMISSIONS: (userId: string) => `user:permissions:${userId}`,
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  
  // Cronograma
  SCHEDULE_DETAIL: (id: string) => `schedule:detail:${id}`,
  SCHEDULE_TASKS: (id: string) => `schedule:tasks:${id}`,
  SCHEDULE_CRITICAL_PATH: (id: string) => `schedule:cpm:${id}`,
  
  // Viagens
  VIAGENS_LIST: (companyId: string) => `viagens:list:${companyId}`,
  VIAGEM_DETAIL: (id: string) => `viagens:detail:${id}`,
  
  // Faturas
  FATURAS_LIST: (companyId: string) => `faturas:list:${companyId}`,
  FATURA_DETAIL: (id: string) => `faturas:detail:${id}`,
  
  // Webhooks
  WEBHOOK_CONFIGS: (companyId: string) => `webhooks:configs:${companyId}`,
  WEBHOOK_LOGS: (id: string) => `webhooks:logs:${id}`,
};

// Interface para entrada de cache
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

// Interface para métricas
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  avgResponseTime: number;
}

// Cache em memória para fallback/desenvolvimento
class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    avgResponseTime: 0,
  };

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      return null;
    }
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }
    
    entry.hits++;
    this.metrics.hits++;
    this.updateAvgResponseTime(Date.now() - start);
    return entry.data;
  }

  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttl * 1000),
      createdAt: Date.now(),
      hits: 0,
    });
    this.metrics.sets++;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.metrics.deletes++;
  }

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.metrics.deletes += count;
    return count;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2;
    const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + amount;
    await this.set(key, newValue, CACHE_TTL.HOUR);
    return newValue;
  }

  getStats(): { totalKeys: number; keys: string[]; memoryUsage: number } {
    return {
      totalKeys: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length,
    };
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  private updateAvgResponseTime(time: number) {
    const totalOps = this.metrics.hits + this.metrics.misses;
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (totalOps - 1) + time) / totalOps;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Cliente Redis para produção
class RedisCache {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    avgResponseTime: 0,
  };

  constructor() {
    this.connect();
  }

  private async connect() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxReconnectAttempts) {
              console.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            // Exponential backoff
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('connect', () => {
        console.log('Redis: Connecting...');
      });

      this.client.on('ready', () => {
        console.log('Redis: Connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('error', (err) => {
        console.error('Redis error:', err);
        this.metrics.errors++;
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('Redis: Connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    const start = Date.now();
    try {
      const data = await this.client.get(key);
      if (!data) {
        this.metrics.misses++;
        return null;
      }
      
      this.metrics.hits++;
      this.updateAvgResponseTime(Date.now() - start);
      return JSON.parse(data) as T;
    } catch (error) {
      this.metrics.errors++;
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(data));
      this.metrics.sets++;
    } catch (error) {
      this.metrics.errors++;
      console.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.del(key);
      this.metrics.deletes++;
    } catch (error) {
      this.metrics.errors++;
      console.error('Redis delete error:', error);
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.metrics.deletes += keys.length;
        return keys.length;
      }
      return 0;
    } catch (error) {
      this.metrics.errors++;
      console.error('Redis deletePattern error:', error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.flushDb();
    } catch (error) {
      this.metrics.errors++;
      console.error('Redis clear error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      return await this.client.exists(key) === 1;
    } catch (error) {
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.client || !this.isConnected) return -2;

    try {
      return await this.client.ttl(key);
    } catch (error) {
      return -2;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    if (!this.client || !this.isConnected) return 0;

    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      this.metrics.errors++;
      return 0;
    }
  }

  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    connectedClients: number;
    uptime: number;
  }> {
    if (!this.client || !this.isConnected) {
      return { totalKeys: 0, memoryUsage: '0', connectedClients: 0, uptime: 0 };
    }

    try {
      const info = await this.client.info('memory');
      const dbSize = await this.client.dbSize();
      
      // Parse memory info
      const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1] || '0';
      const clients = await this.client.info('clients');
      const connectedClients = parseInt(clients.match(/connected_clients:(\d+)/)?.[1] || '0');
      
      const server = await this.client.info('server');
      const uptime = parseInt(server.match(/uptime_in_seconds:(\d+)/)?.[1] || '0');

      return {
        totalKeys: dbSize,
        memoryUsage: usedMemory,
        connectedClients,
        uptime,
      };
    } catch (error) {
      return { totalKeys: 0, memoryUsage: '0', connectedClients: 0, uptime: 0 };
    }
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  isActive(): boolean {
    return this.isConnected;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  private updateAvgResponseTime(time: number) {
    const totalOps = this.metrics.hits + this.metrics.misses;
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (totalOps - 1) + time) / totalOps;
  }
}

// Gerenciador de Cache unificado
class CacheManager {
  private redisCache: RedisCache;
  private memoryCache: MemoryCache;
  private provider: CacheProvider;
  private useFallback: boolean = false;

  constructor() {
    this.redisCache = new RedisCache();
    this.memoryCache = new MemoryCache();
    this.provider = process.env.REDIS_URL ? 'redis' : 'memory';
    
    // Se Redis não conectar em 5 segundos, usar memória
    setTimeout(() => {
      if (!this.redisCache.isActive()) {
        console.log('Redis not available, using memory cache as fallback');
        this.useFallback = true;
      }
    }, 5000);
  }

  private get activeCache(): RedisCache | MemoryCache {
    if (this.provider === 'memory' || this.useFallback || !this.redisCache.isActive()) {
      return this.memoryCache;
    }
    return this.redisCache;
  }

  async get<T>(key: string): Promise<T | null> {
    // Tentar Redis primeiro se disponível
    if (this.provider === 'redis' && !this.useFallback && this.redisCache.isActive()) {
      const data = await this.redisCache.get<T>(key);
      if (data !== null) return data;
    }
    
    // Fallback para memória
    return this.memoryCache.get<T>(key);
  }

  async set<T>(key: string, data: T, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    // Salvar em ambos para redundância
    if (this.provider === 'redis' && !this.useFallback && this.redisCache.isActive()) {
      await this.redisCache.set(key, data, ttl);
    }
    await this.memoryCache.set(key, data, ttl);
  }

  async delete(key: string): Promise<void> {
    if (this.provider === 'redis' && this.redisCache.isActive()) {
      await this.redisCache.delete(key);
    }
    await this.memoryCache.delete(key);
  }

  async deletePattern(pattern: string): Promise<number> {
    let count = 0;
    if (this.provider === 'redis' && this.redisCache.isActive()) {
      count += await this.redisCache.deletePattern(pattern);
    }
    count += await this.memoryCache.deletePattern(pattern);
    return count;
  }

  async clear(): Promise<void> {
    if (this.provider === 'redis' && this.redisCache.isActive()) {
      await this.redisCache.clear();
    }
    await this.memoryCache.clear();
  }

  async exists(key: string): Promise<boolean> {
    if (this.provider === 'redis' && !this.useFallback && this.redisCache.isActive()) {
      return this.redisCache.exists(key);
    }
    return this.memoryCache.exists(key);
  }

  async ttl(key: string): Promise<number> {
    if (this.provider === 'redis' && !this.useFallback && this.redisCache.isActive()) {
      return this.redisCache.ttl(key);
    }
    return this.memoryCache.ttl(key);
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    if (this.provider === 'redis' && !this.useFallback && this.redisCache.isActive()) {
      return this.redisCache.increment(key, amount);
    }
    return this.memoryCache.increment(key, amount);
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }

  getStats(): {
    provider: CacheProvider;
    redis: any;
    memory: any;
    isRedisActive: boolean;
  } {
    return {
      provider: this.provider,
      redis: this.redisCache.isActive() ? this.redisCache.getMetrics() : null,
      memory: this.memoryCache.getMetrics(),
      isRedisActive: this.redisCache.isActive(),
    };
  }

  async getDetailedStats(): Promise<{
    provider: CacheProvider;
    redis: {
      metrics: CacheMetrics;
      stats: any;
    } | null;
    memory: {
      metrics: CacheMetrics;
      stats: any;
    };
    isRedisActive: boolean;
  }> {
    const redisStats = this.redisCache.isActive() 
      ? await this.redisCache.getStats() 
      : null;

    return {
      provider: this.provider,
      redis: redisStats ? {
        metrics: this.redisCache.getMetrics(),
        stats: redisStats,
      } : null,
      memory: {
        metrics: this.memoryCache.getMetrics(),
        stats: this.memoryCache.getStats(),
      },
      isRedisActive: this.redisCache.isActive(),
    };
  }
}

// Instância global do cache
let cacheManager: CacheManager | null = null;

/**
 * Obtém a instância do gerenciador de cache
 */
export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}

/**
 * Obtém dados do cache ou executa função para buscar
 */
export async function cacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> {
  return getCacheManager().getOrSet(key, fetchFn, ttl);
}

/**
 * Invalida cache por padrão
 */
export async function invalidateCache(pattern: string): Promise<number> {
  return getCacheManager().deletePattern(pattern);
}

/**
 * Invalida caches relacionados a uma empresa
 */
export async function invalidateCompanyCache(companyId: string): Promise<number> {
  const patterns = [
    `projects:*:${companyId}`,
    `budgets:*:${companyId}`,
    `config:*:${companyId}`,
    `dashboard:*:${companyId}`,
    `patrimonio:*:${companyId}`,
    `suppliers:*:${companyId}`,
    `purchases:*:${companyId}`,
    `transactions:*:${companyId}`,
    `financial:*:${companyId}`,
    `sinapi:*:${companyId}`,
    `viagens:*:${companyId}`,
    `faturas:*:${companyId}`,
    `webhooks:*:${companyId}`,
  ];
  
  let totalDeleted = 0;
  for (const pattern of patterns) {
    totalDeleted += await invalidateCache(pattern);
  }
  return totalDeleted;
}

/**
 * Invalida caches relacionados a um projeto
 */
export async function invalidateProjectCache(projectId: string): Promise<number> {
  const patterns = [
    `projects:detail:${projectId}*`,
    `projects:evm:${projectId}`,
    `projects:bva:${projectId}`,
    `schedule:*:project:${projectId}`,
  ];
  
  let totalDeleted = 0;
  for (const pattern of patterns) {
    totalDeleted += await invalidateCache(pattern);
  }
  return totalDeleted;
}

/**
 * Invalida caches relacionados a um orçamento
 */
export async function invalidateBudgetCache(budgetId: string): Promise<number> {
  const patterns = [
    `budgets:detail:${budgetId}*`,
    `budgets:versions:${budgetId}`,
    `budgets:abc:${budgetId}`,
  ];
  
  let totalDeleted = 0;
  for (const pattern of patterns) {
    totalDeleted += await invalidateCache(pattern);
  }
  return totalDeleted;
}

/**
 * Invalida caches relacionados a um usuário
 */
export async function invalidateUserCache(userId: string): Promise<number> {
  const patterns = [
    `user:session:${userId}`,
    `user:permissions:${userId}`,
    `user:profile:${userId}`,
  ];
  
  let totalDeleted = 0;
  for (const pattern of patterns) {
    totalDeleted += await invalidateCache(pattern);
  }
  return totalDeleted;
}

/**
 * Invalida caches de dashboard
 */
export async function invalidateDashboardCache(companyId: string): Promise<number> {
  const patterns = [
    `dashboard:stats:${companyId}`,
    `dashboard:alerts:${companyId}`,
    `dashboard:kpis:${companyId}`,
  ];
  
  let totalDeleted = 0;
  for (const pattern of patterns) {
    totalDeleted += await invalidateCache(pattern);
  }
  return totalDeleted;
}

// Decorator para cache automático de métodos
export function Cached(key: string, ttl: number = CACHE_TTL.MEDIUM) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${key}:${JSON.stringify(args)}`;
      return cacheOrFetch(cacheKey, () => originalMethod.apply(this, args), ttl);
    };
    
    return descriptor;
  };
}

// Decorator para invalidação de cache
export function InvalidateCache(...patterns: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      // Invalidar caches após execução bem sucedida
      for (const pattern of patterns) {
        await invalidateCache(pattern);
      }
      
      return result;
    };
    
    return descriptor;
  };
}

// Hook React para cache
export function useCache() {
  const cache = getCacheManager();
  
  return {
    get: <T>(key: string) => cache.get<T>(key),
    set: <T>(key: string, data: T, ttl?: number) => cache.set(key, data, ttl),
    delete: (key: string) => cache.delete(key),
    invalidate: (pattern: string) => invalidateCache(pattern),
    clear: () => cache.clear(),
    exists: (key: string) => cache.exists(key),
    ttl: (key: string) => cache.ttl(key),
    stats: () => cache.getStats(),
  };
}

export default getCacheManager();
