// =============================================================================
// ConstrutorPro - Audit Middleware
// Middleware automático para auditoria de APIs
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auditLogger, AuditAction, AuditCategory, AuditSeverity } from './audit-logger';

// =============================================================================
// Tipos
// =============================================================================

export interface AuditMiddlewareConfig {
  // Actions to audit
  actions?: {
    GET?: AuditAction;
    POST?: AuditAction;
    PUT?: AuditAction;
    PATCH?: AuditAction;
    DELETE?: AuditAction;
  };
  // Resource type being accessed
  resourceType: string;
  // Category for the audit log
  category?: AuditCategory;
  // Custom severity mapping
  severity?: {
    GET?: AuditSeverity;
    POST?: AuditSeverity;
    PUT?: AuditSeverity;
    PATCH?: AuditSeverity;
    DELETE?: AuditSeverity;
  };
  // Extract resource ID from request
  getResourceId?: (request: NextRequest) => string | null;
  // Extract resource name from response
  getResourceName?: (response: NextResponse, body: unknown) => string | null;
  // Custom condition to skip audit
  skipAudit?: (request: NextRequest) => boolean;
  // Include request body in audit
  includeRequestBody?: boolean;
  // Include response body in audit
  includeResponseBody?: boolean;
  // Sensitive fields to mask
  sensitiveFields?: string[];
}

export interface AuditContext {
  userId?: string;
  companyId?: string;
  isMasterAdmin?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_METHOD_ACTIONS: Record<string, AuditAction> = {
  GET: 'data_export',
  POST: 'project_created',
  PUT: 'project_updated',
  PATCH: 'project_updated',
  DELETE: 'project_deleted',
};

const DEFAULT_SEVERITY: Record<string, AuditSeverity> = {
  GET: 'info',
  POST: 'info',
  PUT: 'info',
  PATCH: 'info',
  DELETE: 'warning',
};

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'twoFactorSecret',
  'twoFactorBackupCodes',
  'token',
  'secret',
  'apiKey',
  'creditCard',
  'cvv',
  'ssn',
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Masks sensitive fields in an object
 */
function maskSensitiveFields(
  obj: unknown,
  sensitiveFields: string[] = SENSITIVE_FIELDS
): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveFields(item, sensitiveFields));
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => 
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      masked[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveFields(value, sensitiveFields);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Extracts resource ID from URL path
 */
function extractResourceIdFromPath(request: NextRequest): string | null {
  const path = new URL(request.url).pathname;
  const segments = path.split('/').filter(Boolean);
  
  // Try to find a CUID-like ID (25 character alphanumeric)
  for (const segment of segments) {
    if (/^[a-z0-9]{20,30}$/i.test(segment)) {
      return segment;
    }
  }
  
  // Try to find numeric ID
  for (const segment of segments) {
    if (/^\d+$/.test(segment)) {
      return segment;
    }
  }
  
  return null;
}

// =============================================================================
// Audit Middleware Class
// =============================================================================

export class AuditMiddleware {
  private config: AuditMiddlewareConfig;

  constructor(config: AuditMiddlewareConfig) {
    this.config = {
      category: 'data_modification',
      severity: DEFAULT_SEVERITY,
      sensitiveFields: SENSITIVE_FIELDS,
      ...config,
    };
  }

  /**
   * Wraps an API handler with audit logging
   */
  wrap<T extends (...args: Parameters<T>) => Promise<NextResponse>>(
    handler: T,
    context?: AuditContext
  ): T {
    return (async (...args: Parameters<T>) => {
      const request = args[0] as NextRequest;
      
      // Check if we should skip audit
      if (this.config.skipAudit?.(request)) {
        return handler(...args);
      }

      const startTime = Date.now();
      let response: NextResponse;
      let responseBody: unknown;
      let requestBody: unknown;

      // Parse request body if needed
      if (this.config.includeRequestBody && request.method !== 'GET') {
        try {
          const clonedRequest = request.clone();
          requestBody = await clonedRequest.json();
        } catch {
          // Body may not be JSON
        }
      }

      try {
        response = await handler(...args);
        
        // Parse response body if needed
        if (this.config.includeResponseBody) {
          try {
            const clonedResponse = response.clone();
            responseBody = await clonedResponse.json();
          } catch {
            // Response may not be JSON
          }
        }
      } catch (error) {
        // Log failed operation
        await this.logAudit(request, context, {
          status: 'failure',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime,
          requestBody: this.config.includeRequestBody ? requestBody : undefined,
        });
        throw error;
      }

      // Log successful operation
      await this.logAudit(request, context, {
        status: response.ok ? 'success' : 'failure',
        statusCode: response.status,
        duration: Date.now() - startTime,
        requestBody: this.config.includeRequestBody ? requestBody : undefined,
        responseBody: this.config.includeResponseBody ? responseBody : undefined,
      });

      return response;
    }) as T;
  }

  /**
   * Logs the audit event
   */
  private async logAudit(
    request: NextRequest,
    context: AuditContext | undefined,
    options: {
      status: 'success' | 'failure' | 'blocked';
      statusCode?: number;
      errorMessage?: string;
      duration?: number;
      requestBody?: unknown;
      responseBody?: unknown;
    }
  ): Promise<void> {
    const method = request.method.toUpperCase();
    const action = this.config.actions?.[method as keyof typeof this.config.actions] 
      || DEFAULT_METHOD_ACTIONS[method];
    
    if (!action) return;

    const severity = this.config.severity?.[method as keyof typeof this.config.severity] 
      || DEFAULT_SEVERITY[method];

    const resourceId = this.config.getResourceId?.(request) 
      || extractResourceIdFromPath(request);

    // Mask sensitive data
    const requestBody = options.requestBody 
      ? maskSensitiveFields(options.requestBody, this.config.sensitiveFields)
      : undefined;
    const responseBody = options.responseBody 
      ? maskSensitiveFields(options.responseBody, this.config.sensitiveFields)
      : undefined;

    await auditLogger.log({
      action,
      category: this.config.category!,
      severity,
      status: options.status,
      userId: context?.userId,
      companyId: context?.companyId,
      resourceType: this.config.resourceType,
      resourceId: resourceId || undefined,
      errorMessage: options.errorMessage,
      oldValue: requestBody as Record<string, unknown> | undefined,
      newValue: responseBody as Record<string, unknown> | undefined,
      metadata: {
        method,
        statusCode: options.statusCode,
        duration: options.duration,
        path: new URL(request.url).pathname,
      },
    });
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates an audit middleware instance with common configurations
 */
export function createAuditMiddleware(config: AuditMiddlewareConfig): AuditMiddleware {
  return new AuditMiddleware(config);
}

/**
 * Pre-configured audit middleware for CRUD operations
 */
export const auditPresets = {
  users: createAuditMiddleware({
    resourceType: 'user',
    category: 'user_management',
    actions: {
      GET: 'data_export',
      POST: 'user_created',
      PUT: 'user_updated',
      PATCH: 'user_updated',
      DELETE: 'user_deleted',
    },
    severity: {
      DELETE: 'critical',
      PUT: 'warning',
      PATCH: 'warning',
    },
    includeRequestBody: true,
  }),

  companies: createAuditMiddleware({
    resourceType: 'company',
    category: 'company_management',
    actions: {
      GET: 'data_export',
      POST: 'company_created',
      PUT: 'company_updated',
      PATCH: 'company_updated',
      DELETE: 'company_deleted',
    },
    severity: {
      DELETE: 'critical',
      POST: 'info',
      PUT: 'warning',
      PATCH: 'warning',
    },
  }),

  projects: createAuditMiddleware({
    resourceType: 'project',
    category: 'data_modification',
    actions: {
      GET: 'data_export',
      POST: 'project_created',
      PUT: 'project_updated',
      PATCH: 'project_updated',
      DELETE: 'project_deleted',
    },
    severity: {
      DELETE: 'warning',
    },
  }),

  budgets: createAuditMiddleware({
    resourceType: 'budget',
    category: 'data_modification',
    actions: {
      GET: 'data_export',
      POST: 'budget_created',
      PUT: 'budget_approved',
      PATCH: 'budget_approved',
      DELETE: 'budget_rejected',
    },
  }),

  authentication: createAuditMiddleware({
    resourceType: 'session',
    category: 'authentication',
    actions: {
      POST: 'login',
      DELETE: 'logout',
    },
    severity: {
      POST: 'info',
      DELETE: 'info',
    },
    includeRequestBody: false,
  }),
};

// =============================================================================
// Higher-Order Function for API Routes
// =============================================================================

/**
 * Decorator for API route handlers with automatic audit logging
 * 
 * @example
 * ```ts
 * export const GET = withAudit(
 *   async (request: NextRequest) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   {
 *     resourceType: 'user',
 *     category: 'user_management',
 *   }
 * );
 * ```
 */
export function withAudit<T extends (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  config: AuditMiddlewareConfig
): T {
  const middleware = new AuditMiddleware({
    ...config,
    actions: config.actions || DEFAULT_METHOD_ACTIONS,
  });

  return (async (request: NextRequest, ...args: unknown[]) => {
    // Extract context from request (would typically come from auth middleware)
    const context: AuditContext = {
      // These would be populated by the auth middleware
      // userId: request.headers.get('x-user-id') || undefined,
      // companyId: request.headers.get('x-company-id') || undefined,
    };

    return middleware.wrap(handler, context)(request, ...args);
  }) as T;
}
