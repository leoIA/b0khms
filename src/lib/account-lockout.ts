// =============================================================================
// ConstrutorPro - Account Lockout Service
// Bloqueio de conta após múltiplas falhas de login para proteção contra brute force
// =============================================================================

// =============================================================================
// Tipos e Interfaces
// =============================================================================

export interface AccountLockoutConfig {
  // Número máximo de tentativas falhas antes de bloquear
  maxAttempts: number;
  // Durações de bloqueio progressivas (em ms)
  lockoutDurations: readonly number[];
  // Janela de tempo para contar tentativas (ms)
  attemptWindowMs: number;
  // Prefixo para keys
  keyPrefix?: string;
}

export interface FailedAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
  lockoutLevel: number;
  attempts: Date[];
}

export interface LockoutResult {
  locked: boolean;
  remaining: number;
  lockedUntil?: number;
  lockoutDuration?: number;
}

export interface LockStatus {
  locked: boolean;
  lockedUntil?: number;
  remainingAttempts?: number;
  failedAttempts?: number;
}

// =============================================================================
// Configurações Padrão
// =============================================================================

export const ACCOUNT_LOCKOUT_PRESETS = {
  // Configuração padrão - progressiva
  default: {
    maxAttempts: 5,
    lockoutDurations: [
      15 * 60 * 1000,  // 15 minutos (1º bloqueio)
      30 * 60 * 1000,  // 30 minutos (2º bloqueio)
      60 * 60 * 1000,  // 1 hora (3º bloqueio)
      24 * 60 * 60 * 1000, // 24 horas (4º+ bloqueio)
    ],
    attemptWindowMs: 60 * 60 * 1000, // 1 hora
    keyPrefix: 'lockout',
  },
  // Mais restritivo para admin
  admin: {
    maxAttempts: 3,
    lockoutDurations: [
      30 * 60 * 1000,  // 30 minutos
      60 * 60 * 1000,  // 1 hora
      24 * 60 * 60 * 1000, // 24 horas
    ],
    attemptWindowMs: 30 * 60 * 1000, // 30 minutos
    keyPrefix: 'lockout:admin',
  },
} as const;

// =============================================================================
// In-Memory Account Lockout
// =============================================================================

class InMemoryAccountLockout {
  private attempts: Map<string, FailedAttempt> = new Map();
  private config: AccountLockoutConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: AccountLockoutConfig) {
    this.config = config;
    this.startCleanup();
  }

  /**
   * Registra uma tentativa falha de login
   */
  recordFailure(identifier: string): LockoutResult {
    if (!identifier) {
      return { locked: false, remaining: this.config.maxAttempts };
    }

    const key = this.buildKey(identifier);
    const now = Date.now();
    const current = this.attempts.get(key);

    // Se já está bloqueado, retornar status
    if (current?.lockedUntil && current.lockedUntil > now) {
      return {
        locked: true,
        remaining: 0,
        lockedUntil: current.lockedUntil,
        lockoutDuration: current.lockedUntil - now,
      };
    }

    // Se passou da janela de tempo, resetar
    if (current && now - current.firstAttempt > this.config.attemptWindowMs) {
      this.attempts.delete(key);
    }

    const existing = this.attempts.get(key);
    const attempts = existing?.attempts || [];

    // Adicionar nova tentativa
    attempts.push(new Date(now));

    // Calcular novo nível de bloqueio
    const newCount = (existing?.count || 0) + 1;
    const newLockoutLevel = Math.floor((newCount - this.config.maxAttempts) / this.config.maxAttempts);

    // Verificar se deve bloquear
    if (newCount >= this.config.maxAttempts) {
      const lockoutIndex = Math.min(newLockoutLevel, this.config.lockoutDurations.length - 1);
      const lockoutDuration = this.config.lockoutDurations[lockoutIndex];
      const lockedUntil = now + lockoutDuration;

      this.attempts.set(key, {
        count: newCount,
        firstAttempt: existing?.firstAttempt || now,
        lastAttempt: now,
        lockedUntil,
        lockoutLevel: lockoutIndex,
        attempts,
      });

      return {
        locked: true,
        remaining: 0,
        lockedUntil,
        lockoutDuration,
      };
    }

    // Atualizar contagem sem bloquear
    this.attempts.set(key, {
      count: newCount,
      firstAttempt: existing?.firstAttempt || now,
      lastAttempt: now,
      lockoutLevel: existing?.lockoutLevel || 0,
      attempts,
    });

    return {
      locked: false,
      remaining: this.config.maxAttempts - newCount,
    };
  }

  /**
   * Registra login bem-sucedido - limpa tentativas
   */
  recordSuccess(identifier: string): void {
    if (!identifier) return;
    const key = this.buildKey(identifier);
    this.attempts.delete(key);
  }

  /**
   * Verifica se a conta está bloqueada
   */
  isLocked(identifier: string): LockStatus {
    if (!identifier) {
      return { locked: false };
    }

    const key = this.buildKey(identifier);
    const current = this.attempts.get(key);

    if (!current) {
      return { 
        locked: false,
        remainingAttempts: this.config.maxAttempts,
      };
    }

    if (current.lockedUntil && current.lockedUntil > Date.now()) {
      return {
        locked: true,
        lockedUntil: current.lockedUntil,
        failedAttempts: current.count,
      };
    }

    return {
      locked: false,
      remainingAttempts: this.config.maxAttempts - current.count,
      failedAttempts: current.count,
    };
  }

  /**
   * Desbloqueia manualmente uma conta
   */
  unlock(identifier: string): void {
    if (!identifier) return;
    const key = this.buildKey(identifier);
    this.attempts.delete(key);
  }

  /**
   * Obtém o status completo de tentativas
   */
  getStatus(identifier: string): FailedAttempt | undefined {
    if (!identifier) return undefined;
    const key = this.buildKey(identifier);
    return this.attempts.get(key);
  }

  /**
   * Limpa todas as entradas
   */
  clear(): void {
    this.attempts.clear();
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
    // Normalizar identificador (lowercase para emails)
    const normalized = identifier.toLowerCase().trim();
    const prefix = this.config.keyPrefix || 'lockout';
    return `${prefix}:${normalized}`;
  }

  /**
   * Inicia cleanup automático de bloqueios expirados
   */
  private startCleanup(): void {
    // Executar cleanup a cada 10 minutos
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [key, entry] of this.attempts.entries()) {
        // Remover bloqueios expirados
        if (entry.lockedUntil && entry.lockedUntil < now) {
          this.attempts.delete(key);
        }
        // Remover tentativas antigas fora da janela
        else if (!entry.lockedUntil && now - entry.firstAttempt > this.config.attemptWindowMs) {
          this.attempts.delete(key);
        }
      }
    }, 10 * 60 * 1000);
  }
}

// =============================================================================
// Account Lockout Manager
// =============================================================================

class AccountLockoutManager {
  private static instance: AccountLockoutManager;
  private lockouts: Map<string, InMemoryAccountLockout> = new Map();

  private constructor() {}

  static getInstance(): AccountLockoutManager {
    if (!AccountLockoutManager.instance) {
      AccountLockoutManager.instance = new AccountLockoutManager();
    }
    return AccountLockoutManager.instance;
  }

  /**
   * Obtém ou cria um lockout service para um contexto
   */
  getLockout(context: keyof typeof ACCOUNT_LOCKOUT_PRESETS | AccountLockoutConfig): InMemoryAccountLockout {
    const config = typeof context === 'string' ? ACCOUNT_LOCKOUT_PRESETS[context] : context;
    const key = typeof context === 'string' ? context : `custom:${config.keyPrefix || 'default'}`;

    if (!this.lockouts.has(key)) {
      this.lockouts.set(key, new InMemoryAccountLockout(config));
    }

    return this.lockouts.get(key)!;
  }

  /**
   * Registra falha de login
   */
  recordLoginFailure(email: string, isAdmin: boolean = false): LockoutResult {
    const context = isAdmin ? 'admin' : 'default';
    return this.getLockout(context).recordFailure(email);
  }

  /**
   * Registra login bem-sucedido
   */
  recordLoginSuccess(email: string, isAdmin: boolean = false): void {
    const context = isAdmin ? 'admin' : 'default';
    this.getLockout(context).recordSuccess(email);
  }

  /**
   * Verifica se conta está bloqueada
   */
  checkLockStatus(email: string, isAdmin: boolean = false): LockStatus {
    const context = isAdmin ? 'admin' : 'default';
    return this.getLockout(context).isLocked(email);
  }

  /**
   * Desbloqueia uma conta
   */
  unlockAccount(email: string, isAdmin: boolean = false): void {
    const context = isAdmin ? 'admin' : 'default';
    this.getLockout(context).unlock(email);
  }

  /**
   * Limpa todos os lockouts
   */
  clearAll(): void {
    for (const lockout of this.lockouts.values()) {
      lockout.clear();
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

export const accountLockout = AccountLockoutManager.getInstance();
export { InMemoryAccountLockout };

// =============================================================================
// Helper Functions para API Routes
// =============================================================================

/**
 * Verifica se deve bloquear tentativa de login
 * Retorna null se OK, ou objeto com informações de bloqueio
 */
export function checkAccountLocked(email: string, isAdmin: boolean = false): {
  locked: boolean;
  response?: Response;
  status?: LockStatus;
} {
  const status = accountLockout.checkLockStatus(email, isAdmin);

  if (status.locked) {
    const retryAfter = status.lockedUntil
      ? Math.ceil((status.lockedUntil - Date.now()) / 1000)
      : 900; // 15 min default

    return {
      locked: true,
      status,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'Account Locked',
          message: 'Sua conta está temporariamente bloqueada devido a múltiplas tentativas de login falhas.',
          lockedUntil: status.lockedUntil,
          retryAfter,
        }),
        {
          status: 423, // Locked
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        }
      ),
    };
  }

  return { locked: false, status };
}

/**
 * Registra falha de login e retorna resultado
 */
export function handleLoginFailure(email: string, isAdmin: boolean = false): LockoutResult {
  return accountLockout.recordLoginFailure(email, isAdmin);
}

/**
 * Registra sucesso de login
 */
export function handleLoginSuccess(email: string, isAdmin: boolean = false): void {
  accountLockout.recordLoginSuccess(email, isAdmin);
}
