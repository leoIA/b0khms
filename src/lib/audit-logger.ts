// =============================================================================
// ConstrutorPro - Audit Logger Service
// Serviço para registro de eventos de segurança e conformidade
// =============================================================================

import { db } from '@/lib/db';
import { headers } from 'next/headers';

// =============================================================================
// Tipos e Constantes
// =============================================================================

export type AuditAction =
  // Authentication events
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_change'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'session_revoked'
  | 'session_revoked_all'
  // Two-Factor Authentication
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_verified'
  | '2fa_failed'
  | '2fa_backup_used'
  // User management
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_role_changed'
  | 'user_activated'
  | 'user_deactivated'
  // Company management
  | 'company_created'
  | 'company_updated'
  | 'company_deleted'
  | 'plan_changed'
  // Data access
  | 'data_export'
  | 'data_import'
  | 'report_generated'
  // Data modification
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'budget_created'
  | 'budget_approved'
  | 'budget_rejected'
  | 'transaction_created'
  | 'transaction_updated'
  // System events
  | 'api_key_created'
  | 'api_key_revoked'
  | 'webhook_created'
  | 'webhook_triggered'
  | 'system_config_changed'
  | 'security_alert';

export type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'user_management'
  | 'company_management'
  | 'system';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export type AuditStatus = 'success' | 'failure' | 'blocked';

// Interface para entrada de log
export interface AuditLogInput {
  action: AuditAction;
  category: AuditCategory;
  severity?: AuditSeverity;
  status?: AuditStatus;
  companyId?: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  // Request context (auto-filled if not provided)
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  location?: string;
}

// Mapeamento de ações para severidade padrão
const DEFAULT_SEVERITY: Record<AuditAction, AuditSeverity> = {
  // Authentication - crítico
  login: 'info',
  logout: 'info',
  login_failed: 'warning',
  password_change: 'warning',
  password_reset_request: 'info',
  password_reset_complete: 'warning',
  session_revoked: 'warning',
  session_revoked_all: 'warning',
  // 2FA - crítico
  '2fa_enabled': 'warning',
  '2fa_disabled': 'critical',
  '2fa_verified': 'info',
  '2fa_failed': 'warning',
  '2fa_backup_used': 'warning',
  // User management - crítico para alterações
  user_created: 'info',
  user_updated: 'info',
  user_deleted: 'critical',
  user_role_changed: 'critical',
  user_activated: 'info',
  user_deactivated: 'warning',
  // Company - crítico
  company_created: 'info',
  company_updated: 'info',
  company_deleted: 'critical',
  plan_changed: 'warning',
  // Data access
  data_export: 'info',
  data_import: 'info',
  report_generated: 'info',
  // Data modification
  project_created: 'info',
  project_updated: 'info',
  project_deleted: 'warning',
  budget_created: 'info',
  budget_approved: 'info',
  budget_rejected: 'info',
  transaction_created: 'info',
  transaction_updated: 'info',
  // System
  api_key_created: 'warning',
  api_key_revoked: 'warning',
  webhook_created: 'info',
  webhook_triggered: 'info',
  system_config_changed: 'warning',
  security_alert: 'critical',
};

// Mapeamento de ações para categoria padrão
const DEFAULT_CATEGORY: Record<AuditAction, AuditCategory> = {
  login: 'authentication',
  logout: 'authentication',
  login_failed: 'authentication',
  password_change: 'authentication',
  password_reset_request: 'authentication',
  password_reset_complete: 'authentication',
  session_revoked: 'authentication',
  session_revoked_all: 'authentication',
  '2fa_enabled': 'authentication',
  '2fa_disabled': 'authentication',
  '2fa_verified': 'authentication',
  '2fa_failed': 'authentication',
  '2fa_backup_used': 'authentication',
  user_created: 'user_management',
  user_updated: 'user_management',
  user_deleted: 'user_management',
  user_role_changed: 'user_management',
  user_activated: 'user_management',
  user_deactivated: 'user_management',
  company_created: 'company_management',
  company_updated: 'company_management',
  company_deleted: 'company_management',
  plan_changed: 'company_management',
  data_export: 'data_access',
  data_import: 'data_access',
  report_generated: 'data_access',
  project_created: 'data_modification',
  project_updated: 'data_modification',
  project_deleted: 'data_modification',
  budget_created: 'data_modification',
  budget_approved: 'data_modification',
  budget_rejected: 'data_modification',
  transaction_created: 'data_modification',
  transaction_updated: 'data_modification',
  api_key_created: 'system',
  api_key_revoked: 'system',
  webhook_created: 'system',
  webhook_triggered: 'system',
  system_config_changed: 'system',
  security_alert: 'system',
};

// =============================================================================
// User Agent Parser
// =============================================================================

interface ParsedUserAgent {
  browser: string;
  os: string;
  device: string;
}

function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  const result: ParsedUserAgent = {
    browser: 'Unknown',
    os: 'Unknown',
    device: 'Desktop',
  };

  if (!userAgent) return result;

  const ua = userAgent.toLowerCase();

  // Detect OS
  if (ua.includes('windows')) result.os = 'Windows';
  else if (ua.includes('mac') || ua.includes('darwin')) result.os = 'macOS';
  else if (ua.includes('linux')) result.os = 'Linux';
  else if (ua.includes('android')) result.os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) result.os = 'iOS';

  // Detect Browser
  if (ua.includes('edg/') || ua.includes('edge')) result.browser = 'Microsoft Edge';
  else if (ua.includes('opr/') || ua.includes('opera')) result.browser = 'Opera';
  else if (ua.includes('chrome')) result.browser = 'Google Chrome';
  else if (ua.includes('firefox')) result.browser = 'Mozilla Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) result.browser = 'Safari';

  // Detect Device
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
    result.device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    result.device = 'Tablet';
  }

  return result;
}

// =============================================================================
// Audit Logger Class
// =============================================================================

class AuditLogger {
  /**
   * Registra um evento de auditoria
   */
  async log(input: AuditLogInput): Promise<string> {
    try {
      // Obter contexto da requisição se não fornecido
      let requestContext: Partial<AuditLogInput> = {};

      if (!input.ipAddress || !input.userAgent) {
        requestContext = await this.getRequestContext();
      }

      // Valores padrão
      const severity = input.severity ?? DEFAULT_SEVERITY[input.action] ?? 'info';
      const category = input.category ?? DEFAULT_CATEGORY[input.action] ?? 'system';
      const status = input.status ?? 'success';

      // Parse user agent se não fornecido
      let device = input.device;
      let browser = input.browser;
      let os = input.os;

      if (!device || !browser || !os) {
        const ua = input.userAgent || requestContext.userAgent;
        const parsed = parseUserAgent(ua || null);
        device = device ?? parsed.device;
        browser = browser ?? parsed.browser;
        os = os ?? parsed.os;
      }

      // Criar registro de auditoria
      const auditLog = await db.audit_logs.create({
        data: {
          action: input.action,
          category,
          severity,
          status,
          companyId: input.companyId,
          userId: input.userId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          resourceName: input.resourceName,
          ipAddress: input.ipAddress ?? requestContext.ipAddress,
          userAgent: input.userAgent ?? requestContext.userAgent,
          device,
          browser,
          os,
          location: input.location ?? requestContext.location,
          oldValue: input.oldValue ? JSON.stringify(input.oldValue) : null,
          newValue: input.newValue ? JSON.stringify(input.newValue) : null,
          errorMessage: input.errorMessage,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });

      return auditLog.id;
    } catch (error) {
      // Não deve falhar a operação principal se o log falhar
      console.error('[AuditLogger] Error logging audit event:', error);
      return '';
    }
  }

  /**
   * Obtém contexto da requisição atual
   */
  private async getRequestContext(): Promise<Partial<AuditLogInput>> {
    try {
      const headersList = await headers();

      // Obter IP
      const forwardedFor = headersList.get('x-forwarded-for');
      const realIp = headersList.get('x-real-ip');
      const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || null;

      // Obter User Agent
      const userAgent = headersList.get('user-agent');

      // Obter localização (se disponível via header de CloudFlare ou similar)
      const location = headersList.get('cf-ipcountry') || null;

      return {
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        location: location || undefined,
      };
    } catch {
      // Headers pode não estar disponível fora de request context
      return {};
    }
  }

  /**
   * Busca logs de auditoria com filtros
   */
  async getLogs(options: {
    companyId?: string;
    userId?: string;
    action?: AuditAction | AuditAction[];
    category?: AuditCategory | AuditCategory[];
    severity?: AuditSeverity | AuditSeverity[];
    status?: AuditStatus | AuditStatus[];
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (options.companyId) where.companyId = options.companyId;
    if (options.userId) where.userId = options.userId;

    if (options.action) {
      where.action = Array.isArray(options.action)
        ? { in: options.action }
        : options.action;
    }

    if (options.category) {
      where.category = Array.isArray(options.category)
        ? { in: options.category }
        : options.category;
    }

    if (options.severity) {
      where.severity = Array.isArray(options.severity)
        ? { in: options.severity }
        : options.severity;
    }

    if (options.status) {
      where.status = Array.isArray(options.status)
        ? { in: options.status }
        : options.status;
    }

    if (options.resourceType) where.resourceType = options.resourceType;
    if (options.resourceId) where.resourceId = options.resourceId;

    if (options.startDate || options.endDate) {
      where.createdAt = {
        ...(options.startDate && { gte: options.startDate }),
        ...(options.endDate && { lte: options.endDate }),
      };
    }

    if (options.search) {
      where.OR = [
        { resourceName: { contains: options.search, mode: 'insensitive' } },
        { errorMessage: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      db.audit_logs.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          users: {
            select: { id: true, name: true, email: true },
          },
          companies: {
            select: { id: true, name: true },
          },
        },
      }),
      db.audit_logs.count({ where }),
    ]);

    return { logs: logs as AuditLog[], total };
  }

  /**
   * Obtém estatísticas de auditoria
   */
  async getStats(options: {
    companyId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalEvents: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    recentFailures: number;
    topActions: Array<{ action: string; count: number }>;
  }> {
    const where: Record<string, unknown> = {};

    if (options.companyId) where.companyId = options.companyId;

    if (options.startDate || options.endDate) {
      where.createdAt = {
        ...(options.startDate && { gte: options.startDate }),
        ...(options.endDate && { lte: options.endDate }),
      };
    }

    // Get all logs for stats calculation
    const logs = await db.audit_logs.findMany({
      where,
      select: {
        action: true,
        category: true,
        severity: true,
        status: true,
      },
    });

    // Calculate stats
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    let recentFailures = 0;

    for (const log of logs) {
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      if (log.status === 'failure' || log.status === 'blocked') {
        recentFailures++;
      }
    }

    // Top actions
    const topActions = Object.entries(byAction)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: logs.length,
      byCategory,
      bySeverity,
      byStatus,
      recentFailures,
      topActions,
    };
  }

  /**
   * Limpa logs antigos (mais de 90 dias por padrão)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db.audit_logs.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        severity: { not: 'critical' }, // Keep critical logs
      },
    });

    return result.count;
  }
}

// =============================================================================
// Types for returned logs
// =============================================================================

export interface AuditLog {
  id: string;
  companyId: string | null;
  userId: string | null;
  action: string;
  category: string;
  severity: string;
  resourceType: string | null;
  resourceId: string | null;
  resourceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  oldValue: string | null;
  newValue: string | null;
  status: string;
  errorMessage: string | null;
  metadata: string | null;
  createdAt: Date;
  users?: { id: string; name: string; email: string } | null;
  companies?: { id: string; name: string } | null;
}

// =============================================================================
// Export singleton instance
// =============================================================================

export const auditLogger = new AuditLogger();

// =============================================================================
// Helper functions for common audit events
// =============================================================================

// Extended audit helpers with more flexible signatures
export const auditHelpersExtended = {
  logDataExport: (userId: string, companyId: string, exportType: string, metadata?: Record<string, unknown>) =>
    auditLogger.log({
      action: 'data_export',
      category: 'data_access',
      userId,
      companyId,
      resourceType: exportType,
      metadata,
    }),

  logDataImport: (userId: string, companyId: string, importType: string, metadata?: Record<string, unknown>) =>
    auditLogger.log({
      action: 'data_import',
      category: 'data_access',
      userId,
      companyId,
      resourceType: importType,
      metadata,
    }),
};

export const auditHelpers = {
  login: (userId: string, companyId: string | undefined, success: boolean, errorMessage?: string) =>
    auditLogger.log({
      action: success ? 'login' : 'login_failed',
      category: 'authentication',
      status: success ? 'success' : 'failure',
      severity: success ? 'info' : 'warning',
      userId,
      companyId,
      errorMessage,
    }),

  logout: (userId: string, companyId: string | undefined) =>
    auditLogger.log({
      action: 'logout',
      category: 'authentication',
      userId,
      companyId,
    }),

  passwordChange: (userId: string, companyId: string | undefined) =>
    auditLogger.log({
      action: 'password_change',
      category: 'authentication',
      severity: 'warning',
      userId,
      companyId,
      resourceType: 'user',
      resourceId: userId,
    }),

  twoFactorEnabled: (userId: string, companyId: string | undefined) =>
    auditLogger.log({
      action: '2fa_enabled',
      category: 'authentication',
      severity: 'warning',
      userId,
      companyId,
      resourceType: 'user',
      resourceId: userId,
    }),

  twoFactorDisabled: (userId: string, companyId: string | undefined) =>
    auditLogger.log({
      action: '2fa_disabled',
      category: 'authentication',
      severity: 'critical',
      userId,
      companyId,
      resourceType: 'user',
      resourceId: userId,
    }),

  userCreated: (actorId: string, newUserId: string, companyId: string, userName: string) =>
    auditLogger.log({
      action: 'user_created',
      category: 'user_management',
      userId: actorId,
      companyId,
      resourceType: 'user',
      resourceId: newUserId,
      resourceName: userName,
    }),

  userDeleted: (actorId: string, deletedUserId: string, companyId: string, userName: string) =>
    auditLogger.log({
      action: 'user_deleted',
      category: 'user_management',
      severity: 'critical',
      userId: actorId,
      companyId,
      resourceType: 'user',
      resourceId: deletedUserId,
      resourceName: userName,
    }),

  roleChanged: (
    actorId: string,
    targetUserId: string,
    companyId: string,
    oldRole: string,
    newRole: string
  ) =>
    auditLogger.log({
      action: 'user_role_changed',
      category: 'user_management',
      severity: 'critical',
      userId: actorId,
      companyId,
      resourceType: 'user',
      resourceId: targetUserId,
      oldValue: { role: oldRole },
      newValue: { role: newRole },
    }),

  sessionRevoked: (userId: string, companyId: string | undefined, sessionId: string) =>
    auditLogger.log({
      action: 'session_revoked',
      category: 'authentication',
      severity: 'warning',
      userId,
      companyId,
      resourceType: 'session',
      resourceId: sessionId,
    }),

  dataExport: (userId: string, companyId: string, exportType: string, metadata?: Record<string, unknown>) =>
    auditLogger.log({
      action: 'data_export',
      category: 'data_access',
      userId,
      companyId,
      resourceType: exportType,
      metadata,
    }),

  dataImport: (userId: string, companyId: string, importType: string, metadata?: Record<string, unknown>) =>
    auditLogger.log({
      action: 'data_import',
      category: 'data_access',
      userId,
      companyId,
      resourceType: importType,
      metadata,
    }),

  securityAlert: (companyId: string | undefined, message: string, metadata?: Record<string, unknown>) =>
    auditLogger.log({
      action: 'security_alert',
      category: 'system',
      severity: 'critical',
      companyId,
      errorMessage: message,
      metadata,
    }),
};
