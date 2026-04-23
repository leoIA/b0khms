// =============================================================================
// ConstrutorPro - Security Monitor Service
// Serviço para detecção de padrões suspeitos e alertas automáticos
// =============================================================================

import { db } from '@/lib/db';
import { auditLogger } from '@/lib/audit-logger';

// =============================================================================
// Tipos e Constantes
// =============================================================================

export interface SecurityAlert {
  id: string;
  type: SecurityAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  userId?: string;
  companyId?: string;
  ipAddress?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export type SecurityAlertType =
  | 'multiple_failed_logins'
  | 'unusual_login_location'
  | 'unusual_login_time'
  | 'multiple_sessions'
  | 'privilege_escalation'
  | 'mass_data_export'
  | 'mass_data_deletion'
  | 'api_abuse'
  | 'suspicious_pattern'
  | 'account_takeover_attempt'
  | 'brute_force_attempt'
  | 'credential_stuffing'
  | 'impossible_travel'
  | 'new_device_login'
  | 'sensitive_action_spike';

export interface SecurityRule {
  name: string;
  description: string;
  type: SecurityAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: (params: SecurityCheckParams) => Promise<SecurityAlert | null>;
}

export interface SecurityCheckParams {
  userId?: string;
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
  action?: string;
  resourceType?: string;
  timeWindow?: number; // in minutes
}

// Configuration thresholds
const THRESHOLDS = {
  failedLoginAttempts: 5,
  failedLoginWindow: 15, // minutes
  maxConcurrentSessions: 5,
  dataExportThreshold: 100, // records
  dataDeleteThreshold: 10, // records in short time
  apiCallsPerMinute: 100,
  impossibleTravelSpeed: 500, // km/h
  newDeviceCooldown: 24 * 60, // minutes before device is "known"
  sensitiveActionsPerHour: 10,
};

// =============================================================================
// Security Rules Implementation
// =============================================================================

/**
 * Detecta múltiplas tentativas de login falhas
 */
async function checkMultipleFailedLogins(params: SecurityCheckParams): Promise<SecurityAlert | null> {
  const { userId, companyId, ipAddress, timeWindow = THRESHOLDS.failedLoginWindow } = params;
  
  const since = new Date(Date.now() - timeWindow * 60 * 1000);
  
  // Check by IP
  const byIp = await db.audit_logs.count({
    where: {
      action: 'login_failed',
      ipAddress,
      createdAt: { gte: since },
    },
  });

  if (byIp >= THRESHOLDS.failedLoginAttempts) {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'brute_force_attempt',
      severity: 'high',
      title: 'Possível ataque de força bruta detectado',
      description: `${byIp} tentativas de login falhas do IP ${ipAddress} nos últimos ${timeWindow} minutos`,
      ipAddress,
      companyId,
      metadata: { attempts: byIp, timeWindow, threshold: THRESHOLDS.failedLoginAttempts },
      createdAt: new Date(),
      acknowledged: false,
    };
  }

  // Check by user
  if (userId) {
    const byUser = await db.audit_logs.count({
      where: {
        action: 'login_failed',
        userId,
        createdAt: { gte: since },
      },
    });

    if (byUser >= THRESHOLDS.failedLoginAttempts) {
      return {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'credential_stuffing',
        severity: 'high',
        title: 'Possível credential stuffing detectado',
        description: `${byUser} tentativas de login falhas para o usuário nos últimos ${timeWindow} minutos`,
        userId,
        companyId,
        metadata: { attempts: byUser, timeWindow, threshold: THRESHOLDS.failedLoginAttempts },
        createdAt: new Date(),
        acknowledged: false,
      };
    }
  }

  return null;
}

/**
 * Detecta múltiplas sessões ativas
 */
async function checkMultipleSessions(params: SecurityCheckParams): Promise<SecurityAlert | null> {
  const { userId } = params;
  if (!userId) return null;

  const activeSessions = await db.sessions.count({
    where: {
      userId,
      expires: { gt: new Date() },
    },
  });

  if (activeSessions > THRESHOLDS.maxConcurrentSessions) {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'multiple_sessions',
      severity: 'medium',
      title: 'Múltiplas sessões ativas detectadas',
      description: `Usuário tem ${activeSessions} sessões ativas simultâneas`,
      userId,
      metadata: { sessionCount: activeSessions, threshold: THRESHOLDS.maxConcurrentSessions },
      createdAt: new Date(),
      acknowledged: false,
    };
  }

  return null;
}

/**
 * Detecta exportação massiva de dados
 */
async function checkMassDataExport(params: SecurityCheckParams): Promise<SecurityAlert | null> {
  const { userId, companyId, timeWindow = 60 } = params;
  
  const since = new Date(Date.now() - timeWindow * 60 * 1000);
  
  const exportCount = await db.audit_logs.count({
    where: {
      action: 'data_export',
      userId,
      companyId,
      createdAt: { gte: since },
    },
  });

  if (exportCount >= THRESHOLDS.dataExportThreshold) {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'mass_data_export',
      severity: 'high',
      title: 'Exportação massiva de dados detectada',
      description: `${exportCount} operações de exportação nos últimos ${timeWindow} minutos`,
      userId,
      companyId,
      metadata: { exportCount, timeWindow, threshold: THRESHOLDS.dataExportThreshold },
      createdAt: new Date(),
      acknowledged: false,
    };
  }

  return null;
}

/**
 * Detecta exclusão massiva de dados
 */
async function checkMassDataDeletion(params: SecurityCheckParams): Promise<SecurityAlert | null> {
  const { userId, companyId, timeWindow = 30 } = params;
  
  const since = new Date(Date.now() - timeWindow * 60 * 1000);
  
  const deleteActions = ['user_deleted', 'project_deleted', 'company_deleted'];
  
  const deleteCount = await db.audit_logs.count({
    where: {
      action: { in: deleteActions },
      userId,
      companyId,
      createdAt: { gte: since },
    },
  });

  if (deleteCount >= THRESHOLDS.dataDeleteThreshold) {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'mass_data_deletion',
      severity: 'critical',
      title: 'Exclusão massiva de dados detectada',
      description: `${deleteCount} operações de exclusão nos últimos ${timeWindow} minutos`,
      userId,
      companyId,
      metadata: { deleteCount, timeWindow, threshold: THRESHOLDS.dataDeleteThreshold },
      createdAt: new Date(),
      acknowledged: false,
    };
  }

  return null;
}

/**
 * Detecta login de novo dispositivo
 */
async function checkNewDeviceLogin(params: SecurityCheckParams): Promise<SecurityAlert | null> {
  const { userId, userAgent, ipAddress } = params;
  if (!userId || !userAgent) return null;

  // Parse device info from user agent (simplified)
  const deviceFingerprint = `${userAgent}-${ipAddress}`;
  
  const since = new Date(Date.now() - THRESHOLDS.newDeviceCooldown * 60 * 1000);
  
  // Check if this device has been used before
  const previousLogins = await db.audit_logs.count({
    where: {
      action: 'login',
      userId,
      userAgent,
      createdAt: { lt: since },
    },
  });

  if (previousLogins === 0) {
    // This is a new device after cooldown period
    const recentLogins = await db.audit_logs.findFirst({
      where: {
        action: 'login',
        userId,
        userAgent,
        createdAt: { gte: since },
      },
    });

    if (!recentLogins) {
      return {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'new_device_login',
        severity: 'medium',
        title: 'Login de novo dispositivo detectado',
        description: 'Usuário fez login de um dispositivo não reconhecido',
        userId,
        ipAddress,
        metadata: { userAgent, deviceFingerprint },
        createdAt: new Date(),
        acknowledged: false,
      };
    }
  }

  return null;
}

/**
 * Detecta mudança de role (privilege escalation)
 */
async function checkPrivilegeEscalation(params: SecurityCheckParams): Promise<SecurityAlert | null> {
  const { companyId } = params;
  
  const roleChanges = await db.audit_logs.findMany({
    where: {
      action: 'user_role_changed',
      companyId,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
    },
    include: {
      users: { select: { name: true, email: true } },
    },
  });

  if (!roleChanges || !Array.isArray(roleChanges) || roleChanges.length === 0) {
    return null;
  }

  for (const change of roleChanges) {
    const oldValue = change.oldValue ? JSON.parse(change.oldValue) : null;
    const newValue = change.newValue ? JSON.parse(change.newValue) : null;
    
    // Check for escalation (viewer -> admin, etc.)
    const escalationPatterns = [
      { from: 'viewer', to: 'admin' },
      { from: 'editor', to: 'admin' },
      { from: 'viewer', to: 'manager' },
    ];

    for (const pattern of escalationPatterns) {
      if (oldValue?.role === pattern.from && newValue?.role === pattern.to) {
        return {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'privilege_escalation',
          severity: 'high',
          title: 'Escalação de privilégios detectada',
          description: `Role alterada de ${pattern.from} para ${pattern.to}`,
          userId: change.userId || undefined,
          companyId,
          metadata: { 
            oldRole: pattern.from, 
            newRole: pattern.to,
            changedBy: change.users?.email,
          },
          createdAt: new Date(),
          acknowledged: false,
        };
      }
    }
  }

  return null;
}

/**
 * Detecta padrão de viagem impossível (login de locais distantes em pouco tempo)
 */
async function checkImpossibleTravel(params: SecurityCheckParams): Promise<SecurityAlert | null> {
  const { userId } = params;
  if (!userId) return null;

  // Get last 2 successful logins
  const recentLogins = await db.audit_logs.findMany({
    where: {
      action: 'login',
      userId,
      status: 'success',
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });

  if (!recentLogins || !Array.isArray(recentLogins) || recentLogins.length < 2) return null;

  const [latest, previous] = recentLogins;
  
  // If we have location data, check distance
  // This is a simplified check - in production you'd use GeoIP
  if (latest.location && previous.location && latest.location !== previous.location) {
    const timeDiff = (latest.createdAt.getTime() - previous.createdAt.getTime()) / (1000 * 60 * 60); // hours
    
    // If logins happened in different locations within 1 hour
    if (timeDiff < 1) {
      return {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'impossible_travel',
        severity: 'critical',
        title: 'Viagem impossível detectada',
        description: `Login de locais diferentes em intervalo muito curto (${timeDiff.toFixed(2)} horas)`,
        userId,
        ipAddress: latest.ipAddress || undefined,
        metadata: {
          previousLocation: previous.location,
          currentLocation: latest.location,
          timeDiffHours: timeDiff,
          previousIp: previous.ipAddress,
          currentIp: latest.ipAddress,
        },
        createdAt: new Date(),
        acknowledged: false,
      };
    }
  }

  return null;
}

/**
 * Detecta pico de ações sensíveis
 */
async function checkSensitiveActionSpike(params: SecurityCheckParams): Promise<SecurityAlert | null> {
  const { userId, companyId, timeWindow = 60 } = params;
  
  const since = new Date(Date.now() - timeWindow * 60 * 1000);
  
  const sensitiveActions = [
    'user_deleted',
    'company_deleted',
    'user_role_changed',
    '2fa_disabled',
    'password_change',
    'session_revoked_all',
    'api_key_created',
    'webhook_created',
  ];

  const count = await db.audit_logs.count({
    where: {
      action: { in: sensitiveActions },
      userId,
      companyId,
      createdAt: { gte: since },
    },
  });

  if (count >= THRESHOLDS.sensitiveActionsPerHour) {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'sensitive_action_spike',
      severity: 'high',
      title: 'Pico de ações sensíveis detectado',
      description: `${count} ações sensíveis executadas nos últimos ${timeWindow} minutos`,
      userId,
      companyId,
      metadata: { count, timeWindow, threshold: THRESHOLDS.sensitiveActionsPerHour },
      createdAt: new Date(),
      acknowledged: false,
    };
  }

  return null;
}

// =============================================================================
// Security Monitor Class
// =============================================================================

class SecurityMonitor {
  private rules: SecurityRule[] = [
    {
      name: 'Multiple Failed Logins',
      description: 'Detecta múltiplas tentativas de login falhas',
      type: 'multiple_failed_logins',
      severity: 'high',
      check: checkMultipleFailedLogins,
    },
    {
      name: 'Multiple Active Sessions',
      description: 'Detecta múltiplas sessões ativas',
      type: 'multiple_sessions',
      severity: 'medium',
      check: checkMultipleSessions,
    },
    {
      name: 'Mass Data Export',
      description: 'Detecta exportação massiva de dados',
      type: 'mass_data_export',
      severity: 'high',
      check: checkMassDataExport,
    },
    {
      name: 'Mass Data Deletion',
      description: 'Detecta exclusão massiva de dados',
      type: 'mass_data_deletion',
      severity: 'critical',
      check: checkMassDataDeletion,
    },
    {
      name: 'New Device Login',
      description: 'Detecta login de dispositivo novo',
      type: 'new_device_login',
      severity: 'medium',
      check: checkNewDeviceLogin,
    },
    {
      name: 'Privilege Escalation',
      description: 'Detecta escalação de privilégios',
      type: 'privilege_escalation',
      severity: 'high',
      check: checkPrivilegeEscalation,
    },
    {
      name: 'Impossible Travel',
      description: 'Detecta viagem impossível entre logins',
      type: 'impossible_travel',
      severity: 'critical',
      check: checkImpossibleTravel,
    },
    {
      name: 'Sensitive Action Spike',
      description: 'Detecta pico de ações sensíveis',
      type: 'sensitive_action_spike',
      severity: 'high',
      check: checkSensitiveActionSpike,
    },
  ];

  private alertCache: Map<string, SecurityAlert> = new Map();

  /**
   * Executa todas as regras de segurança
   */
  async runSecurityChecks(params: SecurityCheckParams): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];

    for (const rule of this.rules) {
      try {
        const alert = await rule.check(params);
        if (alert && !this.isDuplicate(alert)) {
          alerts.push(alert);
          this.alertCache.set(alert.id, alert);
          
          // Log the security alert
          await auditLogger.log({
            action: 'security_alert',
            category: 'system',
            severity: alert.severity === 'critical' ? 'critical' : 
                       alert.severity === 'high' ? 'warning' : 'info',
            userId: alert.userId,
            companyId: alert.companyId,
            ipAddress: alert.ipAddress,
            errorMessage: alert.title,
            metadata: {
              alertType: alert.type,
              description: alert.description,
              ...alert.metadata,
            },
          });
        }
      } catch (error) {
        console.error(`[SecurityMonitor] Error running rule ${rule.name}:`, error);
      }
    }

    return alerts;
  }

  /**
   * Verifica se o alerta é duplicado
   */
  private isDuplicate(alert: SecurityAlert): boolean {
    // Check for similar alert in last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [, cached] of this.alertCache) {
      if (
        cached.type === alert.type &&
        cached.userId === alert.userId &&
        cached.ipAddress === alert.ipAddress &&
        cached.createdAt.getTime() > oneHourAgo
      ) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Obtém alertas ativos
   */
  async getActiveAlerts(options?: {
    companyId?: string;
    userId?: string;
    severity?: string[];
    limit?: number;
  }): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    for (const [, alert] of this.alertCache) {
      if (alert.acknowledged) continue;
      if (options?.companyId && alert.companyId !== options.companyId) continue;
      if (options?.userId && alert.userId !== options.userId) continue;
      if (options?.severity && !options.severity.includes(alert.severity)) continue;
      
      alerts.push(alert);
    }

    // Sort by severity and date
    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return alerts.slice(0, options?.limit || 50);
  }

  /**
   * Marca alerta como reconhecido
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alertCache.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Obtém estatísticas de segurança
   */
  async getSecurityStats(companyId?: string): Promise<{
    totalAlerts: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    recentAlerts: SecurityAlert[];
    topOffenders: Array<{ userId: string; alertCount: number }>;
  }> {
    const alerts = companyId 
      ? [...this.alertCache.values()].filter(a => a.companyId === companyId)
      : [...this.alertCache.values()];

    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const userAlerts: Record<string, number> = {};

    for (const alert of alerts) {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      if (alert.userId) {
        userAlerts[alert.userId] = (userAlerts[alert.userId] || 0) + 1;
      }
    }

    const topOffenders = Object.entries(userAlerts)
      .map(([userId, alertCount]) => ({ userId, alertCount }))
      .sort((a, b) => b.alertCount - a.alertCount)
      .slice(0, 10);

    return {
      totalAlerts: alerts.length,
      bySeverity,
      byType,
      recentAlerts: alerts.slice(-10),
      topOffenders,
    };
  }

  /**
   * Limpa cache antigo
   */
  cleanupOldAlerts(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    
    for (const [id, alert] of this.alertCache) {
      if (alert.createdAt.getTime() < cutoff) {
        this.alertCache.delete(id);
      }
    }
  }
}

// =============================================================================
// Export
// =============================================================================

export const securityMonitor = new SecurityMonitor();

// Export individual functions for testing
export const securityChecks = {
  checkMultipleFailedLogins,
  checkMultipleSessions,
  checkMassDataExport,
  checkMassDataDeletion,
  checkNewDeviceLogin,
  checkPrivilegeEscalation,
  checkImpossibleTravel,
  checkSensitiveActionSpike,
};
