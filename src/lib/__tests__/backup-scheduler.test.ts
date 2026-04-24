// =============================================================================
// ConstrutorPro - Backup Scheduler Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    backup_schedules: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    backup_history: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/backup-service', () => ({
  backupService: {
    createBackup: vi.fn().mockResolvedValue({
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        companyId: 'company-1',
        companyName: 'Test Company',
        modules: ['projects'],
        recordCounts: { projects: 10 },
        checksum: 'abc123',
        encrypted: true,
      },
      data: { projects: [] },
    }),
    restoreBackup: vi.fn().mockResolvedValue({
      success: true,
      modulesRestored: ['projects'],
      recordsImported: { projects: 10 },
      errors: [],
      warnings: [],
    }),
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue('log-id'),
  },
}));

vi.mock('@/lib/notification-service', () => ({
  notificationService: {
    send: vi.fn().mockResolvedValue(true),
  },
}));

import { backupScheduler } from '../backup-scheduler';
import { db } from '@/lib/db';

describe('BackupScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSchedule', () => {
    it('should throw error if no modules provided', async () => {
      const config = {
        companyId: 'company-1',
        name: 'Empty Backup',
        frequency: 'daily' as const,
        modules: [],
        retentionDays: 30,
        maxBackups: 10,
        encryptBackups: true,
        compressBackups: true,
        scheduledTime: '02:00',
        timezone: 'America/Sao_Paulo',
        notifyOnSuccess: true,
        notifyOnFailure: true,
        isActive: true,
      };

      await expect(backupScheduler.createSchedule(config)).rejects.toThrow(
        'Pelo menos um módulo deve ser selecionado'
      );
    });

    it('should create a daily backup schedule', async () => {
      const config = {
        companyId: 'company-1',
        name: 'Daily Backup',
        frequency: 'daily' as const,
        modules: ['projects', 'clients'],
        retentionDays: 30,
        maxBackups: 10,
        encryptBackups: true,
        compressBackups: true,
        scheduledTime: '02:00',
        timezone: 'America/Sao_Paulo',
        notifyOnSuccess: true,
        notifyOnFailure: true,
        isActive: true,
      };

      vi.mocked(db.backup_schedules.create).mockResolvedValue({
        id: 'schedule-1',
        companyId: 'company-1',
        name: 'Daily Backup',
        description: null,
        frequency: 'daily',
        modules: JSON.stringify(['projects', 'clients']),
        retentionDays: 30,
        maxBackups: 10,
        encryptBackups: true,
        compressBackups: true,
        scheduledTime: '02:00',
        timezone: 'America/Sao_Paulo',
        daysOfWeek: null,
        dayOfMonth: null,
        cronExpression: null,
        notifyOnSuccess: true,
        notifyOnFailure: true,
        notifyEmails: null,
        isActive: true,
        nextRunAt: new Date(),
        lastRunAt: null,
        lastStatus: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Awaited<ReturnType<typeof db.backup_schedules.create>>);

      const result = await backupScheduler.createSchedule(config);

      expect(result.id).toBe('schedule-1');
      expect(result.nextRunAt).toBeInstanceOf(Date);
      expect(db.backup_schedules.create).toHaveBeenCalled();
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule name', async () => {
      vi.mocked(db.backup_schedules.update).mockResolvedValue({} as unknown as Awaited<ReturnType<typeof db.backup_schedules.update>>);

      await backupScheduler.updateSchedule('schedule-1', { name: 'New Name' });

      expect(db.backup_schedules.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'schedule-1' },
          data: { name: 'New Name' },
        })
      );
    });
  });

  describe('deleteSchedule', () => {
    it('should delete schedule', async () => {
      vi.mocked(db.backup_schedules.delete).mockResolvedValue({} as unknown as Awaited<ReturnType<typeof db.backup_schedules.delete>>);

      await backupScheduler.deleteSchedule('schedule-1');

      expect(db.backup_schedules.delete).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
      });
    });
  });

  describe('listSchedules', () => {
    it('should list all schedules for company', async () => {
      vi.mocked(db.backup_schedules.findMany).mockResolvedValue([
        {
          id: 'schedule-1',
          companyId: 'company-1',
          name: 'Daily Backup',
          description: null,
          frequency: 'daily',
          modules: JSON.stringify(['projects']),
          retentionDays: 30,
          maxBackups: 10,
          encryptBackups: true,
          compressBackups: true,
          scheduledTime: '02:00',
          timezone: 'America/Sao_Paulo',
          daysOfWeek: null,
          dayOfMonth: null,
          cronExpression: null,
          notifyOnSuccess: true,
          notifyOnFailure: true,
          notifyEmails: null,
          isActive: true,
          nextRunAt: new Date(),
          lastRunAt: null,
          lastStatus: null,
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as unknown as Awaited<ReturnType<typeof db.backup_schedules.findMany>>);

      const schedules = await backupScheduler.listSchedules('company-1');

      expect(schedules).toHaveLength(1);
      expect(schedules[0].name).toBe('Daily Backup');
      expect(schedules[0].modules).toEqual(['projects']);
    });
  });

  describe('listBackupHistory', () => {
    it('should list backup history', async () => {
      vi.mocked(db.backup_history.findMany).mockResolvedValue([
        {
          id: 'backup-1',
          scheduleId: null,
          companyId: 'company-1',
          triggeredBy: 'user-1',
          triggerType: 'manual',
          modules: JSON.stringify(['projects']),
          encrypted: true,
          compressed: true,
          status: 'success',
          recordCounts: JSON.stringify({ projects: 10 }),
          checksum: 'abc123',
          storagePath: 'company-1/backup-1.json.gz',
          fileSize: 1024,
          durationMs: 500,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          errorMessage: null,
          errorStack: null,
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as unknown as Awaited<ReturnType<typeof db.backup_history.findMany>>);

      vi.mocked(db.backup_history.count).mockResolvedValue(1);

      const result = await backupScheduler.listBackupHistory({ companyId: 'company-1' });

      expect(result.total).toBe(1);
      expect(result.history).toHaveLength(1);
      expect(result.history[0].modules).toEqual(['projects']);
    });
  });

  describe('getSchedule', () => {
    it('should return null for non-existent schedule', async () => {
      vi.mocked(db.backup_schedules.findUnique).mockResolvedValue(null);

      const result = await backupScheduler.getSchedule('non-existent');

      expect(result).toBeNull();
    });

    it('should return schedule config', async () => {
      vi.mocked(db.backup_schedules.findUnique).mockResolvedValue({
        id: 'schedule-1',
        companyId: 'company-1',
        name: 'Daily Backup',
        description: null,
        frequency: 'daily',
        modules: JSON.stringify(['projects']),
        retentionDays: 30,
        maxBackups: 10,
        encryptBackups: true,
        compressBackups: true,
        scheduledTime: '02:00',
        timezone: 'America/Sao_Paulo',
        daysOfWeek: null,
        dayOfMonth: null,
        cronExpression: null,
        notifyOnSuccess: true,
        notifyOnFailure: true,
        notifyEmails: null,
        isActive: true,
        nextRunAt: new Date(),
        lastRunAt: null,
        lastStatus: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Awaited<ReturnType<typeof db.backup_schedules.findUnique>>);

      const result = await backupScheduler.getSchedule('schedule-1');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Daily Backup');
    });
  });

  describe('start/stop scheduler', () => {
    it('should start and stop scheduler', () => {
      backupScheduler.start(1);
      backupScheduler.stop();
      // No errors should be thrown
    });
  });
});
