// =============================================================================
// ConstrutorPro - Production Monitoring and Logging
// Structured logging, performance tracking, and error reporting
// =============================================================================

/**
 * Log levels for structured logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  requestId?: string;
  userId?: string;
  companyId?: string;
  duration?: number;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

/**
 * Production-ready logger with structured output
 */
class Logger {
  private config: LoggerConfig;
  
  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      enableConsole: String(process.env.NODE_ENV) !== 'test',
      enableRemote: String(process.env.NODE_ENV) === 'production',
      remoteEndpoint: process.env.LOG_ENDPOINT,
      ...config,
    };
  }
  
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }
  
  private formatEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    
    return entry;
  }
  
  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;
    
    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch {
      // Silently fail - don't disrupt the app for logging issues
    }
  }
  
  private output(entry: LogEntry): void {
    if (!this.config.enableConsole) return;
    
    const { level, message, context, error, duration } = entry;
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, context || '', duration ? `(${duration}ms)` : '');
        break;
      case 'info':
        console.info(prefix, message, context || '', duration ? `(${duration}ms)` : '');
        break;
      case 'warn':
        console.warn(prefix, message, context || '', duration ? `(${duration}ms)` : '');
        break;
      case 'error':
      case 'critical':
        console.error(prefix, message, context || '', error || '', duration ? `(${duration}ms)` : '');
        break;
    }
  }
  
  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    const entry = this.formatEntry('debug', message, context);
    this.output(entry);
  }
  
  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    const entry = this.formatEntry('info', message, context);
    this.output(entry);
    this.sendToRemote(entry);
  }
  
  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    const entry = this.formatEntry('warn', message, context);
    this.output(entry);
    this.sendToRemote(entry);
  }
  
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;
    const entry = this.formatEntry('error', message, context, error);
    this.output(entry);
    this.sendToRemote(entry);
  }
  
  critical(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog('critical')) return;
    const entry = this.formatEntry('critical', message, context, error);
    this.output(entry);
    this.sendToRemote(entry);
  }
  
  /**
   * Create a timer for performance logging
   */
  timer(label: string, context?: Record<string, unknown>): {
    end: (additionalContext?: Record<string, unknown>) => number;
  } {
    const start = performance.now();
    
    return {
      end: (additionalContext?: Record<string, unknown>) => {
        const duration = Math.round(performance.now() - start);
        this.info(`${label} completed`, { ...context, ...additionalContext, duration });
        return duration;
      },
    };
  }
  
  /**
   * Log API request/response
   */
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string,
    companyId?: string
  ): void {
    const entry = this.formatEntry(
      statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      `API ${method} ${path}`,
      { method, path, statusCode, duration }
    );
    entry.userId = userId;
    entry.companyId = companyId;
    entry.duration = duration;
    
    this.output(entry);
    this.sendToRemote(entry);
  }
}

// Export singleton logger instance
export const logger = new Logger();

/**
 * Performance monitoring utilities
 */
export const PerformanceMonitor = {
  /**
   * Track database query performance
   */
  trackQuery: <T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> => {
    const timer = logger.timer(`DB Query: ${queryName}`);
    
    return queryFn()
      .then((result) => {
        timer.end();
        return result;
      })
      .catch((error) => {
        timer.end();
        logger.error(`DB Query failed: ${queryName}`, error);
        throw error;
      });
  },
  
  /**
   * Track external API call performance
   */
  trackApiCall: <T>(
    apiName: string,
    callFn: () => Promise<T>
  ): Promise<T> => {
    const timer = logger.timer(`API Call: ${apiName}`);
    
    return callFn()
      .then((result) => {
        timer.end();
        return result;
      })
      .catch((error) => {
        timer.end();
        logger.error(`API Call failed: ${apiName}`, error);
        throw error;
      });
  },
  
  /**
   * Track cache hit/miss ratio
   */
  cacheStats: {
    hits: 0,
    misses: 0,
    
    recordHit(): void {
      this.hits++;
    },
    
    recordMiss(): void {
      this.misses++;
    },
    
    getStats(): { hits: number; misses: number; ratio: number } {
      const total = this.hits + this.misses;
      return {
        hits: this.hits,
        misses: this.misses,
        ratio: total > 0 ? this.hits / total : 0,
      };
    },
    
    reset(): void {
      this.hits = 0;
      this.misses = 0;
    },
  },
};

/**
 * Health check utilities
 */
export const HealthCheck = {
  /**
   * Check database connectivity
   */
  async checkDatabase(): Promise<{ healthy: boolean; latency: number }> {
    const start = performance.now();
    
    try {
      const { db } = await import('./db');
      await db.$queryRaw`SELECT 1`;
      
      return {
        healthy: true,
        latency: Math.round(performance.now() - start),
      };
    } catch (error) {
      logger.error('Database health check failed', error as Error);
      return {
        healthy: false,
        latency: Math.round(performance.now() - start),
      };
    }
  },
  
  /**
   * Check cache connectivity
   */
  async checkCache(): Promise<{ healthy: boolean; latency: number }> {
    const start = performance.now();
    
    try {
      const { cache } = await import('./cache');
      await cache.set('health:check', 'ok', 10);
      const result = await cache.get('health:check');
      
      return {
        healthy: result === 'ok',
        latency: Math.round(performance.now() - start),
      };
    } catch (error) {
      logger.error('Cache health check failed', error as Error);
      return {
        healthy: false,
        latency: Math.round(performance.now() - start),
      };
    }
  },
  
  /**
   * Full system health check
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      database: { healthy: boolean; latency: number };
      cache: { healthy: boolean; latency: number };
    };
    timestamp: string;
    version: string;
  }> {
    const [database, cacheResult] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
    ]);
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (database.healthy && cacheResult.healthy) {
      status = 'healthy';
    } else if (database.healthy) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      checks: {
        database,
        cache: cacheResult,
      },
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    };
  },
};

// Export types
export type { LoggerConfig };
