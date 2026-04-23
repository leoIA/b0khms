// =============================================================================
// ConstrutorPro - Rate Limiter Service
// Limitação de requisições por IP e usuário para proteção contra ataques
// =============================================================================

// =============================================================================
// Tipos e Interfaces
// =============================================================================

export interface RateLimitConfig {
  // Número máximo de requisições permitidas na janela
  maxRequests: number;
  // Duração da janela em milissegundos
  windowMs: number;
  // Duração do bloqueio após exceder limite (ms)
  blockDurationMs: number;
  // Prefixo para keys (útil para diferentes contextos)
  keyPrefix?: string;
}

export interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockedUntil?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  blocked?: boolean;
  blockedUntil?: number;
  retryAfter?: number;
}

// =============================================================================
// Configurações Padrão por Contexto
// =============================================================================

export const RATE_LIMIT_PRESETS = {
  // Autenticação - mais restritivo
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 15 * 60 * 1000, // 15 minutos
    keyPrefix: 'auth',
  },
  // API geral
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 5 * 60 * 1000, // 5 minutos
    keyPrefix: 'api',
  },
  // Upload de arquivos
  upload: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 30 * 60 * 1000, // 30 minutos
    keyPrefix: 'upload',
  },
  // Busca/pesquisa
  search: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 5 * 60 * 1000, // 5 minutos
    keyPrefix: 'search',
  },
  // Password reset
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hora
    blockDurationMs: 24 * 60 * 60 * 1000, // 24 horas
    keyPrefix: 'pwdreset',
  },
} as const;

// =============================================================================
// In-Memory Rate Limiter (para desenvolvimento e serverless)
// =============================================================================

class InMemoryRateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.startCleanup();
  }

  /**
   * Verifica se uma requisição é permitida
   */
  check(identifier: string): RateLimitResult {
    const key = this.buildKey(identifier);
    const now = Date.now();

    const entry = this.requests.get(key);

    // Verificar se está bloqueado
    if (entry?.blocked && entry.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.blockedUntil,
        blocked: true,
        blockedUntil: entry.blockedUntil,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }

    // Limpar entrada expirada
    if (entry && now - entry.firstRequest > this.config.windowMs) {
      this.requests.delete(key);
    }

    // Obter ou criar entrada
    const current = this.requests.get(key);

    if (!current) {
      this.requests.set(key, {
        count: 1,
        firstRequest: now,
        blocked: false,
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
    }

    // Verificar se excedeu o limite
    if (current.count >= this.config.maxRequests) {
      const blockedUntil = now + this.config.blockDurationMs;
      
      this.requests.set(key, {
        ...current,
        blocked: true,
        blockedUntil,
      });

      return {
        allowed: false,
        remaining: 0,
        resetAt: current.firstRequest + this.config.windowMs,
        blocked: true,
        blockedUntil,
        retryAfter: Math.ceil(this.config.blockDurationMs / 1000),
      };
    }

    // Incrementar contador
    this.requests.set(key, {
      ...current,
      count: current.count + 1,
    });

    return {
      allowed: true,
      remaining: this.config.maxRequests - current.count - 1,
      resetAt: current.firstRequest + this.config.windowMs,
    };
  }

  /**
   * Reseta o rate limit para um identificador
   */
  reset(identifier: string): void {
    const key = this.buildKey(identifier);
    this.requests.delete(key);
  }

  /**
   * Obtém o status atual de um identificador
   */
  getStatus(identifier: string): RateLimitEntry | undefined {
    const key = this.buildKey(identifier);
    return this.requests.get(key);
  }

  /**
   * Limpa todas as entradas
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Para o cleanup automático
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Constrói a chave de armazenamento
   */
  private buildKey(identifier: string): string {
    const prefix = this.config.keyPrefix || 'ratelimit';
    return `${prefix}:${identifier}`;
  }

  /**
   * Inicia cleanup automático de entradas expiradas
   */
  private startCleanup(): void {
    // Executar cleanup a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [key, entry] of this.requests.entries()) {
        // Remover entradas expiradas ou bloqueios expirados
        const isExpired = now - entry.firstRequest > this.config.windowMs;
        const isBlockExpired = entry.blockedUntil && entry.blockedUntil < now;
        
        if (isExpired || isBlockExpired) {
          this.requests.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
}

// =============================================================================
// Rate Limiter Manager (instâncias por contexto)
// =============================================================================

class RateLimiterManager {
  private static instance: RateLimiterManager;
  private limiters: Map<string, InMemoryRateLimiter> = new Map();

  private constructor() {}

  static getInstance(): RateLimiterManager {
    if (!RateLimiterManager.instance) {
      RateLimiterManager.instance = new RateLimiterManager();
    }
    return RateLimiterManager.instance;
  }

  /**
   * Obtém ou cria um rate limiter para um contexto
   */
  getLimiter(context: keyof typeof RATE_LIMIT_PRESETS | RateLimitConfig): InMemoryRateLimiter {
    const config = typeof context === 'string' ? RATE_LIMIT_PRESETS[context] : context;
    const key = typeof context === 'string' ? context : `custom:${config.keyPrefix || 'default'}`;

    if (!this.limiters.has(key)) {
      this.limiters.set(key, new InMemoryRateLimiter(config));
    }

    return this.limiters.get(key)!;
  }

  /**
   * Verifica rate limit para autenticação
   */
  checkAuth(identifier: string): RateLimitResult {
    return this.getLimiter('auth').check(identifier);
  }

  /**
   * Verifica rate limit para API geral
   */
  checkApi(identifier: string): RateLimitResult {
    return this.getLimiter('api').check(identifier);
  }

  /**
   * Verifica rate limit para uploads
   */
  checkUpload(identifier: string): RateLimitResult {
    return this.getLimiter('upload').check(identifier);
  }

  /**
   * Verifica rate limit para busca
   */
  checkSearch(identifier: string): RateLimitResult {
    return this.getLimiter('search').check(identifier);
  }

  /**
   * Verifica rate limit para password reset
   */
  checkPasswordReset(identifier: string): RateLimitResult {
    return this.getLimiter('passwordReset').check(identifier);
  }

  /**
   * Reseta rate limit para um contexto e identificador
   */
  reset(context: keyof typeof RATE_LIMIT_PRESETS, identifier: string): void {
    this.getLimiter(context).reset(identifier);
  }

  /**
   * Limpa todos os limiters
   */
  clearAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.clear();
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

export const rateLimiter = RateLimiterManager.getInstance();
export { InMemoryRateLimiter };

// =============================================================================
// Helper Functions para uso em API Routes
// =============================================================================

/**
 * Obtém IP do cliente da requisição
 */
export function getClientIp(request: Request): string {
  // Verificar headers de proxy
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback para desenvolvimento
  return 'unknown';
}

/**
 * Middleware helper para verificar rate limit
 */
export function checkRateLimit(
  request: Request,
  context: keyof typeof RATE_LIMIT_PRESETS = 'api'
): { success: true } | { success: false; response: Response } {
  const ip = getClientIp(request);
  const result = rateLimiter.getLimiter(context).check(ip);

  if (!result.allowed) {
    const headers: Record<string, string> = {
      'Retry-After': String(result.retryAfter || 60),
      'X-RateLimit-Limit': String(RATE_LIMIT_PRESETS[context].maxRequests),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    };

    if (result.blockedUntil) {
      headers['X-RateLimit-Blocked-Until'] = String(Math.ceil(result.blockedUntil / 1000));
    }

    return {
      success: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'Too Many Requests',
          message: 'Muitas requisições. Tente novamente mais tarde.',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      ),
    };
  }

  return { success: true };
}

/**
 * Gera headers de rate limit para resposta
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
  maxRequests: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}
