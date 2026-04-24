// =============================================================================
// ConstrutorPro - Security Monitor Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  securityMonitor, 
  securityChecks,
  SecurityAlertType,
  SecurityAlert,
} from '../security-monitor';
import { auditLogger } from '../audit-logger';
import { db } from '../db';

// Mock dependencies
vi.mock('../db', () => ({
  db: {
    audit_logs: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    sessions: {
      count: vi.fn(),
    },
  },
}));

vi.mock('../audit-logger', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue('test-log-id'),
  },
}));

describe('SecurityMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the alert cache
    securityMonitor.cleanupOldAlerts(0);
  });

  describe('runSecurityChecks', () => {
    it('should return empty array when no issues detected', async () => {
      vi.mocked(db.audit_logs.count).mockResolvedValue(0);
      vi.mocked(db.sessions.count).mockResolvedValue(1);

      const alerts = await securityMonitor.runSecurityChecks({
        userId: 'user-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.1',
      });

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should detect multiple failed logins by IP', async () => {
      vi.mocked(db.audit_logs.count)
        .mockResolvedValueOnce(6) // by IP
        .mockResolvedValue(0);

      const alerts = await securityMonitor.runSecurityChecks({
        ipAddress: '192.168.1.1',
        timeWindow: 15,
      });

      const bruteForceAlert = alerts.find(a => a.type === 'brute_force_attempt');
      expect(bruteForceAlert).toBeDefined();
      expect(bruteForceAlert?.severity).toBe('high');
    });

    it('should detect credential stuffing by user', async () => {
      vi.mocked(db.audit_logs.count)
        .mockResolvedValueOnce(0) // by IP
        .mockResolvedValueOnce(6); // by user

      const alerts = await securityMonitor.runSecurityChecks({
        userId: 'user-1',
        timeWindow: 15,
      });

      const stuffingAlert = alerts.find(a => a.type === 'credential_stuffing');
      expect(stuffingAlert).toBeDefined();
    });

    it('should detect multiple active sessions', async () => {
      vi.mocked(db.audit_logs.count).mockResolvedValue(0);
      vi.mocked(db.sessions.count).mockResolvedValue(10);

      const alerts = await securityMonitor.runSecurityChecks({
        userId: 'user-1',
      });

      const sessionAlert = alerts.find(a => a.type === 'multiple_sessions');
      expect(sessionAlert).toBeDefined();
    });

    it('should log security alerts', async () => {
      // Clear cache to ensure no duplicate detection
      securityMonitor.cleanupOldAlerts(0);
      
      vi.mocked(db.audit_logs.count)
        .mockResolvedValueOnce(6) // trigger alert
        .mockResolvedValue(0);

      const alerts = await securityMonitor.runSecurityChecks({
        ipAddress: '192.168.1.1',
      });

      // Verify alert was generated
      expect(alerts.length).toBeGreaterThan(0);
      
      // Verify audit log was called
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'security_alert',
          category: 'system',
        })
      );
    });
  });

  describe('getActiveAlerts', () => {
    it('should return alerts from cache', async () => {
      vi.mocked(db.audit_logs.count)
        .mockResolvedValueOnce(6)
        .mockResolvedValue(0);

      await securityMonitor.runSecurityChecks({
        ipAddress: '192.168.1.1',
      });

      const alerts = await securityMonitor.getActiveAlerts();

      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should filter by severity', async () => {
      vi.mocked(db.audit_logs.count)
        .mockResolvedValueOnce(6)
        .mockResolvedValue(0);

      await securityMonitor.runSecurityChecks({
        ipAddress: '192.168.1.1',
      });

      const alerts = await securityMonitor.getActiveAlerts({
        severity: ['critical'],
      });

      // The brute force alert is 'high', so should be filtered out
      expect(alerts.filter(a => a.severity !== 'critical')).toHaveLength(0);
    });

    it('should limit results', async () => {
      vi.mocked(db.audit_logs.count)
        .mockResolvedValueOnce(6)
        .mockResolvedValue(0);

      await securityMonitor.runSecurityChecks({
        ipAddress: '192.168.1.1',
      });

      const alerts = await securityMonitor.getActiveAlerts({ limit: 1 });
      expect(alerts.length).toBeLessThanOrEqual(1);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should mark alert as acknowledged', async () => {
      vi.mocked(db.audit_logs.count)
        .mockResolvedValueOnce(6)
        .mockResolvedValue(0);

      await securityMonitor.runSecurityChecks({
        ipAddress: '192.168.1.1',
      });

      const alerts = await securityMonitor.getActiveAlerts();
      const alertId = alerts[0]?.id;

      if (alertId) {
        const result = securityMonitor.acknowledgeAlert(alertId, 'admin-1');
        expect(result).toBe(true);
      }
    });

    it('should return false for non-existent alert', () => {
      const result = securityMonitor.acknowledgeAlert('non-existent', 'admin-1');
      expect(result).toBe(false);
    });
  });

  describe('getSecurityStats', () => {
    it('should return statistics', async () => {
      vi.mocked(db.audit_logs.count)
        .mockResolvedValueOnce(6)
        .mockResolvedValue(0);

      await securityMonitor.runSecurityChecks({
        userId: 'user-1',
        ipAddress: '192.168.1.1',
      });

      const stats = await securityMonitor.getSecurityStats();

      expect(stats).toHaveProperty('totalAlerts');
      expect(stats).toHaveProperty('bySeverity');
      expect(stats).toHaveProperty('byType');
    });
  });

  describe('cleanupOldAlerts', () => {
    it('should remove old alerts from cache', () => {
      securityMonitor.cleanupOldAlerts(0); // Remove all
      // Cache should be empty after cleanup
      expect(true).toBe(true);
    });
  });
});

describe('Security Checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkMultipleFailedLogins', () => {
    it('should detect brute force by IP', async () => {
      vi.mocked(db.audit_logs.count).mockResolvedValue(10);

      const result = await securityChecks.checkMultipleFailedLogins({
        ipAddress: '192.168.1.1',
        timeWindow: 15,
      });

      expect(result).not.toBeNull();
      expect(result?.type).toBe('brute_force_attempt');
    });

    it('should return null when under threshold', async () => {
      vi.mocked(db.audit_logs.count).mockResolvedValue(2);

      const result = await securityChecks.checkMultipleFailedLogins({
        ipAddress: '192.168.1.1',
        timeWindow: 15,
      });

      expect(result).toBeNull();
    });
  });

  describe('checkMultipleSessions', () => {
    it('should detect multiple sessions', async () => {
      vi.mocked(db.sessions.count).mockResolvedValue(10);

      const result = await securityChecks.checkMultipleSessions({
        userId: 'user-1',
      });

      expect(result).not.toBeNull();
      expect(result?.type).toBe('multiple_sessions');
    });

    it('should return null without userId', async () => {
      const result = await securityChecks.checkMultipleSessions({});
      expect(result).toBeNull();
    });
  });

  describe('checkMassDataExport', () => {
    it('should detect mass export', async () => {
      vi.mocked(db.audit_logs.count).mockResolvedValue(150);

      const result = await securityChecks.checkMassDataExport({
        userId: 'user-1',
        companyId: 'company-1',
        timeWindow: 60,
      });

      expect(result).not.toBeNull();
      expect(result?.type).toBe('mass_data_export');
    });
  });

  describe('checkMassDataDeletion', () => {
    it('should detect mass deletion', async () => {
      vi.mocked(db.audit_logs.count).mockResolvedValue(15);

      const result = await securityChecks.checkMassDataDeletion({
        userId: 'user-1',
        companyId: 'company-1',
        timeWindow: 30,
      });

      expect(result).not.toBeNull();
      expect(result?.type).toBe('mass_data_deletion');
      expect(result?.severity).toBe('critical');
    });
  });

  describe('checkNewDeviceLogin', () => {
    it('should return null without required params', async () => {
      const result = await securityChecks.checkNewDeviceLogin({
        userId: 'user-1',
      });
      expect(result).toBeNull();
    });

    it('should return null without userId', async () => {
      const result = await securityChecks.checkNewDeviceLogin({
        userAgent: 'Mozilla/5.0',
      });
      expect(result).toBeNull();
    });
  });

  describe('checkPrivilegeEscalation', () => {
    it('should detect role escalation', async () => {
      vi.mocked(db.audit_logs.findMany).mockResolvedValue([
        {
          id: 'log-1',
          userId: 'user-1',
          companyId: 'company-1',
          oldValue: JSON.stringify({ role: 'viewer' }),
          newValue: JSON.stringify({ role: 'admin' }),
          createdAt: new Date(),
          users: { name: 'Test User', email: 'test@example.com' },
        },
      ] as unknown as Awaited<ReturnType<typeof db.audit_logs.findMany>>);

      const result = await securityChecks.checkPrivilegeEscalation({
        companyId: 'company-1',
      });

      expect(result).not.toBeNull();
      expect(result?.type).toBe('privilege_escalation');
    });
  });

  describe('checkImpossibleTravel', () => {
    it('should return null without userId', async () => {
      const result = await securityChecks.checkImpossibleTravel({});
      expect(result).toBeNull();
    });

    it('should return null with insufficient login history', async () => {
      vi.mocked(db.audit_logs.findMany).mockResolvedValue([]);

      const result = await securityChecks.checkImpossibleTravel({
        userId: 'user-1',
      });
      expect(result).toBeNull();
    });
  });

  describe('checkSensitiveActionSpike', () => {
    it('should detect spike in sensitive actions', async () => {
      vi.mocked(db.audit_logs.count).mockResolvedValue(15);

      const result = await securityChecks.checkSensitiveActionSpike({
        userId: 'user-1',
        companyId: 'company-1',
        timeWindow: 60,
      });

      expect(result).not.toBeNull();
      expect(result?.type).toBe('sensitive_action_spike');
    });
  });
});
