// =============================================================================
// ConstrutorPro - Backup Scheduler Service
// Serviço de agendamento automático de backups com retenção e notificações
// =============================================================================

import { db } from '@/lib/db';
import { backupService, BackupModule, BackupData } from '@/lib/backup-service';
import { auditLogger } from '@/lib/audit-logger';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// =============================================================================
// Types
// =============================================================================

export interface BackupScheduleConfig {
  id?: string;
  companyId: string;
  name: string;
  description?: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  modules: BackupModule[];
  retentionDays: number;
  maxBackups: number;
  encryptBackups: boolean;
  compressBackups: boolean;
  scheduledTime: string; // HH:mm
  timezone: string;
  daysOfWeek?: number[]; // 0-6, 0 = Sunday
  dayOfMonth?: number; // 1-31
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notifyEmails?: string[];
  isActive: boolean;
}

export interface BackupExecutionResult {
  success: boolean;
  backupId: string;
  scheduleId?: string;
  status: 'success' | 'failed' | 'partial';
  modules: BackupModule[];
  recordCounts: Record<string, number>;
  fileSize: number;
  duration: number;
  checksum: string;
  storagePath: string;
  error?: string;
}

export interface BackupListOptions {
  companyId: string;
  status?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Constants
// =============================================================================

const BACKUP_STORAGE_PATH = process.env.BACKUP_STORAGE_PATH || './backups';
const DEFAULT_ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'default-backup-key-change-in-production';

const FREQUENCY_INTERVALS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

// =============================================================================
// Backup Scheduler Class
// =============================================================================

class BackupScheduler {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  // ---------------------------------------------------------------------------
  // Schedule Management
  // ---------------------------------------------------------------------------

  /**
   * Cria um novo agendamento de backup
   */
  async createSchedule(config: BackupScheduleConfig): Promise<{ id: string; nextRunAt: Date }> {
    // Validate modules
    if (!config.modules || config.modules.length === 0) {
      throw new Error('Pelo menos um módulo deve ser selecionado');
    }

    // Calculate next run time
    const nextRunAt = this.calculateNextRun(config);

    // Create schedule in database
    const schedule = await db.backup_schedules.create({
      data: {
        companyId: config.companyId,
        name: config.name,
        description: config.description,
        frequency: config.frequency,
        modules: JSON.stringify(config.modules),
        retentionDays: config.retentionDays,
        maxBackups: config.maxBackups,
        encryptBackups: config.encryptBackups,
        compressBackups: config.compressBackups,
        scheduledTime: config.scheduledTime,
        timezone: config.timezone,
        daysOfWeek: config.daysOfWeek ? JSON.stringify(config.daysOfWeek) : null,
        dayOfMonth: config.dayOfMonth,
        notifyOnSuccess: config.notifyOnSuccess,
        notifyOnFailure: config.notifyOnFailure,
        notifyEmails: config.notifyEmails ? JSON.stringify(config.notifyEmails) : null,
        isActive: config.isActive,
        nextRunAt,
      },
    });

    return {
      id: schedule.id,
      nextRunAt,
    };
  }

  /**
   * Atualiza um agendamento existente
   */
  async updateSchedule(scheduleId: string, config: Partial<BackupScheduleConfig>): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (config.name) updateData.name = config.name;
    if (config.description !== undefined) updateData.description = config.description;
    if (config.frequency) updateData.frequency = config.frequency;
    if (config.modules) updateData.modules = JSON.stringify(config.modules);
    if (config.retentionDays) updateData.retentionDays = config.retentionDays;
    if (config.maxBackups) updateData.maxBackups = config.maxBackups;
    if (config.encryptBackups !== undefined) updateData.encryptBackups = config.encryptBackups;
    if (config.compressBackups !== undefined) updateData.compressBackups = config.compressBackups;
    if (config.scheduledTime) updateData.scheduledTime = config.scheduledTime;
    if (config.timezone) updateData.timezone = config.timezone;
    if (config.daysOfWeek) updateData.daysOfWeek = JSON.stringify(config.daysOfWeek);
    if (config.dayOfMonth) updateData.dayOfMonth = config.dayOfMonth;
    if (config.notifyOnSuccess !== undefined) updateData.notifyOnSuccess = config.notifyOnSuccess;
    if (config.notifyOnFailure !== undefined) updateData.notifyOnFailure = config.notifyOnFailure;
    if (config.notifyEmails) updateData.notifyEmails = JSON.stringify(config.notifyEmails);
    if (config.isActive !== undefined) updateData.isActive = config.isActive;

    // Recalculate next run if schedule changed
    if (config.frequency || config.scheduledTime || config.daysOfWeek || config.dayOfMonth) {
      const current = await db.backup_schedules.findUnique({
        where: { id: scheduleId },
      });
      if (current) {
        updateData.nextRunAt = this.calculateNextRun({
          frequency: (config.frequency || current.frequency) as BackupScheduleConfig['frequency'],
          scheduledTime: config.scheduledTime || current.scheduledTime,
          daysOfWeek: config.daysOfWeek || (current.daysOfWeek ? JSON.parse(current.daysOfWeek) : undefined),
          dayOfMonth: config.dayOfMonth || current.dayOfMonth || undefined,
        });
      }
    }

    await db.backup_schedules.update({
      where: { id: scheduleId },
      data: updateData,
    });
  }

  /**
   * Remove um agendamento
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    await db.backup_schedules.delete({
      where: { id: scheduleId },
    });
  }

  /**
   * Lista agendamentos de uma empresa
   */
  async listSchedules(companyId: string): Promise<BackupScheduleConfig[]> {
    const schedules = await db.backup_schedules.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return schedules.map(s => this.mapScheduleToConfig(s));
  }

  /**
   * Obtém um agendamento específico
   */
  async getSchedule(scheduleId: string): Promise<BackupScheduleConfig | null> {
    const schedule = await db.backup_schedules.findUnique({
      where: { id: scheduleId },
    });

    return schedule ? this.mapScheduleToConfig(schedule) : null;
  }

  // ---------------------------------------------------------------------------
  // Backup Execution
  // ---------------------------------------------------------------------------

  /**
   * Executa um backup manual
   */
  async executeManualBackup(
    companyId: string,
    userId: string,
    modules: BackupModule[],
    options?: {
      encrypt?: boolean;
      compress?: boolean;
    }
  ): Promise<BackupExecutionResult> {
    const startTime = Date.now();

    // Create history record
    const history = await db.backup_history.create({
      data: {
        companyId,
        triggeredBy: userId,
        triggerType: 'manual',
        modules: JSON.stringify(modules),
        encrypted: options?.encrypt ?? true,
        compressed: options?.compress ?? true,
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      // Create backup data
      const backupData = await backupService.createBackup({
        companyId,
        userId,
        modules,
        encrypt: options?.encrypt ?? true,
      });

      // Calculate checksum
      const checksum = this.generateChecksum(backupData);

      // Store backup
      const { storagePath, fileSize } = await this.storeBackup(
        backupData,
        companyId,
        history.id,
        options?.compress ?? true
      );

      // Calculate duration
      const duration = Date.now() - startTime;

      // Record counts
      const recordCounts = backupData.metadata.recordCounts;

      // Update history
      await db.backup_history.update({
        where: { id: history.id },
        data: {
          status: 'success',
          recordCounts: JSON.stringify(recordCounts),
          checksum,
          storagePath,
          fileSize,
          durationMs: duration,
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      // Log audit
      await auditLogger.log({
        action: 'data_export',
        category: 'data_access',
        userId,
        companyId,
        resourceType: 'backup',
        resourceId: history.id,
        metadata: {
          modules,
          fileSize,
          duration,
          triggerType: 'manual',
        },
      });

      return {
        success: true,
        backupId: history.id,
        status: 'success',
        modules,
        recordCounts: recordCounts as Record<string, number>,
        fileSize,
        duration,
        checksum,
        storagePath,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update history with error
      await db.backup_history.update({
        where: { id: history.id },
        data: {
          status: 'failed',
          errorMessage,
          durationMs: duration,
          completedAt: new Date(),
        },
      });

      return {
        success: false,
        backupId: history.id,
        status: 'failed',
        modules,
        recordCounts: {},
        fileSize: 0,
        duration,
        checksum: '',
        storagePath: '',
        error: errorMessage,
      };
    }
  }

  /**
   * Executa backups agendados pendentes
   */
  async processScheduledBackups(): Promise<BackupExecutionResult[]> {
    if (this.isRunning) {
      console.log('[BackupScheduler] Already running, skipping...');
      return [];
    }

    this.isRunning = true;
    const results: BackupExecutionResult[] = [];

    try {
      // Find schedules that need to run
      const now = new Date();
      const pendingSchedules = await db.backup_schedules.findMany({
        where: {
          isActive: true,
          nextRunAt: { lte: now },
        },
      });

      for (const schedule of pendingSchedules) {
        try {
          const result = await this.executeScheduledBackup(schedule.id);
          results.push(result);

          // Update schedule
          const config = this.mapScheduleToConfig(schedule);
          const nextRunAt = this.calculateNextRun(config);

          await db.backup_schedules.update({
            where: { id: schedule.id },
            data: {
              lastRunAt: now,
              nextRunAt,
              lastStatus: result.success ? 'success' : 'failed',
              lastError: result.error || null,
            },
          });
        } catch (error) {
          console.error(`[BackupScheduler] Error executing schedule ${schedule.id}:`, error);
        }
      }

      // Cleanup old backups
      await this.cleanupExpiredBackups();

      return results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Executa um backup agendado específico
   */
  private async executeScheduledBackup(scheduleId: string): Promise<BackupExecutionResult> {
    const startTime = Date.now();
    const schedule = await db.backup_schedules.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const modules = JSON.parse(schedule.modules) as BackupModule[];

    // Create history record
    const history = await db.backup_history.create({
      data: {
        scheduleId,
        companyId: schedule.companyId,
        triggeredBy: 'system',
        triggerType: 'scheduled',
        modules: schedule.modules,
        encrypted: schedule.encryptBackups,
        compressed: schedule.compressBackups,
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      // Create backup
      const backupData = await backupService.createBackup({
        companyId: schedule.companyId,
        userId: 'system',
        modules,
        encrypt: schedule.encryptBackups,
      });

      const checksum = this.generateChecksum(backupData);

      // Store backup
      const { storagePath, fileSize } = await this.storeBackup(
        backupData,
        schedule.companyId,
        history.id,
        schedule.compressBackups
      );

      const duration = Date.now() - startTime;
      const recordCounts = backupData.metadata.recordCounts;

      // Calculate expiry
      const expiresAt = new Date(Date.now() + schedule.retentionDays * 24 * 60 * 60 * 1000);

      // Update history
      await db.backup_history.update({
        where: { id: history.id },
        data: {
          status: 'success',
          recordCounts: JSON.stringify(recordCounts),
          checksum,
          storagePath,
          fileSize,
          durationMs: duration,
          completedAt: new Date(),
          expiresAt,
        },
      });

      // Send success notification if configured
      if (schedule.notifyOnSuccess && schedule.notifyEmails) {
        await this.sendNotification(
          JSON.parse(schedule.notifyEmails),
          'success',
          schedule.name,
          {
            duration,
            fileSize,
            modules,
          }
        );
      }

      return {
        success: true,
        backupId: history.id,
        scheduleId,
        status: 'success',
        modules,
        recordCounts: recordCounts as Record<string, number>,
        fileSize,
        duration,
        checksum,
        storagePath,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update history with error
      await db.backup_history.update({
        where: { id: history.id },
        data: {
          status: 'failed',
          errorMessage,
          durationMs: duration,
          completedAt: new Date(),
        },
      });

      // Update schedule with error
      await db.backup_schedules.update({
        where: { id: scheduleId },
        data: {
          lastStatus: 'failed',
          lastError: errorMessage,
        },
      });

      // Send failure notification if configured
      if (schedule.notifyOnFailure && schedule.notifyEmails) {
        await this.sendNotification(
          JSON.parse(schedule.notifyEmails),
          'failed',
          schedule.name,
          { error: errorMessage }
        );
      }

      return {
        success: false,
        backupId: history.id,
        scheduleId,
        status: 'failed',
        modules,
        recordCounts: {},
        fileSize: 0,
        duration,
        checksum: '',
        storagePath: '',
        error: errorMessage,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Backup History
  // ---------------------------------------------------------------------------

  /**
   * Lista histórico de backups
   */
  async listBackupHistory(options: BackupListOptions): Promise<{
    history: Array<{
      id: string;
      scheduleId: string | null;
      triggerType: string;
      status: string;
      modules: string[];
      fileSize: number | null;
      duration: number | null;
      createdAt: Date;
      completedAt: Date | null;
      errorMessage: string | null;
    }>;
    total: number;
  }> {
    const where: Record<string, unknown> = { companyId: options.companyId };
    if (options.status) where.status = options.status;

    const [history, total] = await Promise.all([
      db.backup_history.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0,
      }),
      db.backup_history.count({ where }),
    ]);

    return {
      history: history.map(h => ({
        id: h.id,
        scheduleId: h.scheduleId,
        triggerType: h.triggerType,
        status: h.status,
        modules: JSON.parse(h.modules),
        fileSize: h.fileSize,
        duration: h.durationMs,
        createdAt: h.createdAt,
        completedAt: h.completedAt,
        errorMessage: h.errorMessage,
      })),
      total,
    };
  }

  /**
   * Obtém detalhes de um backup específico
   */
  async getBackupDetails(backupId: string): Promise<{
    id: string;
    companyId: string;
    status: string;
    modules: string[];
    recordCounts: Record<string, number> | null;
    checksum: string | null;
    storagePath: string | null;
    fileSize: number | null;
    duration: number | null;
    createdAt: Date;
    completedAt: Date | null;
    expiresAt: Date | null;
    errorMessage: string | null;
  } | null> {
    const backup = await db.backup_history.findUnique({
      where: { id: backupId },
    });

    if (!backup) return null;

    return {
      id: backup.id,
      companyId: backup.companyId,
      status: backup.status,
      modules: JSON.parse(backup.modules),
      recordCounts: backup.recordCounts ? JSON.parse(backup.recordCounts) : null,
      checksum: backup.checksum,
      storagePath: backup.storagePath,
      fileSize: backup.fileSize,
      duration: backup.durationMs,
      createdAt: backup.createdAt,
      completedAt: backup.completedAt,
      expiresAt: backup.expiresAt,
      errorMessage: backup.errorMessage,
    };
  }

  // ---------------------------------------------------------------------------
  // Restore Operations
  // ---------------------------------------------------------------------------

  /**
   * Restaura um backup
   */
  async restoreBackup(
    backupId: string,
    userId: string,
    options?: {
      modules?: BackupModule[];
      overwrite?: boolean;
    }
  ): Promise<{
    success: boolean;
    modulesRestored: string[];
    recordsImported: Record<string, number>;
    errors: string[];
    warnings: string[];
  }> {
    // Get backup details
    const backup = await db.backup_history.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      return {
        success: false,
        modulesRestored: [],
        recordsImported: {},
        errors: ['Backup não encontrado'],
        warnings: [],
      };
    }

    // Load backup data
    const backupData = await this.loadBackup(backup.storagePath);

    if (!backupData) {
      return {
        success: false,
        modulesRestored: [],
        recordsImported: {},
        errors: ['Não foi possível carregar o arquivo de backup'],
        warnings: [],
      };
    }

    // Filter modules if specified
    if (options?.modules && options.modules.length > 0) {
      backupData.metadata.modules = options.modules;
      const filteredData: Record<string, unknown> = {};
      for (const mod of options.modules) {
        if (backupData.data[mod]) {
          filteredData[mod] = backupData.data[mod];
        }
      }
      backupData.data = filteredData;
    }

    // Execute restore using existing backup service
    const result = await backupService.restoreBackup({
      companyId: backup.companyId,
      userId,
      backupData,
      overwrite: options?.overwrite ?? false,
    });

    // Log audit
    await auditLogger.log({
      action: 'data_import',
      category: 'data_access',
      userId,
      companyId: backup.companyId,
      resourceType: 'backup',
      resourceId: backupId,
      metadata: {
        modulesRestored: result.modulesRestored,
        recordsImported: result.recordsImported,
        overwrite: options?.overwrite,
      },
    });

    return result;
  }

  /**
   * Baixa um backup
   */
  async downloadBackup(backupId: string): Promise<{
    data: Buffer;
    filename: string;
    mimeType: string;
  } | null> {
    const backup = await db.backup_history.findUnique({
      where: { id: backupId },
    });

    if (!backup || !backup.storagePath) return null;

    try {
      const filePath = path.join(BACKUP_STORAGE_PATH, backup.storagePath);
      const compressedData = await fs.readFile(filePath);
      
      // Decompress if needed
      let data: Buffer;
      if (backup.compressed) {
        data = await gunzip(compressedData) as Buffer;
      } else {
        data = compressedData;
      }

      const filename = `backup_${backup.companyId}_${backup.createdAt.toISOString().split('T')[0]}.json`;

      return {
        data,
        filename,
        mimeType: 'application/json',
      };
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Scheduler Control
  // ---------------------------------------------------------------------------

  /**
   * Inicia o scheduler
   */
  start(intervalMinutes: number = 5): void {
    if (this.schedulerInterval) {
      this.stop();
    }

    console.log(`[BackupScheduler] Starting scheduler with ${intervalMinutes} minute interval`);

    // Run immediately
    this.processScheduledBackups().catch(console.error);

    // Schedule periodic checks
    this.schedulerInterval = setInterval(() => {
      this.processScheduledBackups().catch(console.error);
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Para o scheduler
   */
  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log('[BackupScheduler] Stopped');
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helper Methods
  // ---------------------------------------------------------------------------

  private calculateNextRun(config: Partial<BackupScheduleConfig>): Date {
    const now = new Date();
    const [hours, minutes] = (config.scheduledTime || '02:00').split(':').map(Number);

    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    switch (config.frequency) {
      case 'hourly':
        // Next hour at the specified minute
        if (nextRun <= now) {
          nextRun.setHours(nextRun.getHours() + 1);
        }
        break;

      case 'daily':
        // Next day at the specified time
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        // Next occurrence of specified day(s)
        const daysOfWeek = config.daysOfWeek || [1]; // Default to Monday
        let foundNext = false;
        let attempts = 0;

        while (!foundNext && attempts < 7) {
          if (nextRun > now && daysOfWeek.includes(nextRun.getDay())) {
            foundNext = true;
          } else {
            nextRun.setDate(nextRun.getDate() + 1);
          }
          attempts++;
        }
        break;

      case 'monthly':
        // Specified day of month
        const dayOfMonth = config.dayOfMonth || 1;
        nextRun.setDate(dayOfMonth);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }

    return nextRun;
  }

  private mapScheduleToConfig(s: { 
    id: string;
    companyId: string;
    name: string;
    description: string | null;
    frequency: string;
    modules: string;
    retentionDays: number;
    maxBackups: number;
    encryptBackups: boolean;
    compressBackups: boolean;
    scheduledTime: string;
    timezone: string;
    daysOfWeek: string | null;
    dayOfMonth: number | null;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
    notifyEmails: string | null;
    isActive: boolean;
  }): BackupScheduleConfig {
    return {
      id: s.id,
      companyId: s.companyId,
      name: s.name,
      description: s.description || undefined,
      frequency: s.frequency as BackupScheduleConfig['frequency'],
      modules: JSON.parse(s.modules) as BackupModule[],
      retentionDays: s.retentionDays,
      maxBackups: s.maxBackups,
      encryptBackups: s.encryptBackups,
      compressBackups: s.compressBackups,
      scheduledTime: s.scheduledTime,
      timezone: s.timezone,
      daysOfWeek: s.daysOfWeek ? JSON.parse(s.daysOfWeek) : undefined,
      dayOfMonth: s.dayOfMonth || undefined,
      notifyOnSuccess: s.notifyOnSuccess,
      notifyOnFailure: s.notifyOnFailure,
      notifyEmails: s.notifyEmails ? JSON.parse(s.notifyEmails) : undefined,
      isActive: s.isActive,
    };
  }

  private async storeBackup(
    backupData: BackupData,
    companyId: string,
    backupId: string,
    compress: boolean
  ): Promise<{ storagePath: string; fileSize: number }> {
    // Ensure backup directory exists
    const companyPath = path.join(BACKUP_STORAGE_PATH, companyId);
    await fs.mkdir(companyPath, { recursive: true });

    // Generate filename
    const filename = `${backupId}.json${compress ? '.gz' : ''}`;
    const filePath = path.join(companyPath, filename);
    const storagePath = `${companyId}/${filename}`;

    // Serialize and optionally compress
    let data: Buffer;
    const jsonData = JSON.stringify(backupData);

    if (compress) {
      data = await gzip(Buffer.from(jsonData)) as Buffer;
    } else {
      data = Buffer.from(jsonData);
    }

    // Write file
    await fs.writeFile(filePath, data);

    return {
      storagePath,
      fileSize: data.length,
    };
  }

  private async loadBackup(storagePath: string | null): Promise<BackupData | null> {
    if (!storagePath) return null;

    try {
      const filePath = path.join(BACKUP_STORAGE_PATH, storagePath);
      const compressedData = await fs.readFile(filePath);
      
      // Try to decompress
      let data: string;
      try {
        const decompressed = await gunzip(compressedData);
        data = decompressed.toString();
      } catch {
        // Not compressed
        data = compressedData.toString();
      }

      return JSON.parse(data) as BackupData;
    } catch {
      return null;
    }
  }

  private generateChecksum(data: unknown): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 32);
  }

  private async cleanupExpiredBackups(): Promise<void> {
    const now = new Date();

    // Find expired backups
    const expiredBackups = await db.backup_history.findMany({
      where: {
        expiresAt: { lt: now },
        status: 'success',
      },
    });

    for (const backup of expiredBackups) {
      try {
        // Delete file
        if (backup.storagePath) {
          const filePath = path.join(BACKUP_STORAGE_PATH, backup.storagePath);
          await fs.unlink(filePath).catch(() => {}); // Ignore errors
        }

        // Delete record
        await db.backup_history.delete({
          where: { id: backup.id },
        });
      } catch (error) {
        console.error(`[BackupScheduler] Error cleaning up backup ${backup.id}:`, error);
      }
    }

    // Also enforce maxBackups per schedule
    const schedules = await db.backup_schedules.findMany();
    for (const schedule of schedules) {
      const backups = await db.backup_history.findMany({
        where: { scheduleId: schedule.id, status: 'success' },
        orderBy: { createdAt: 'desc' },
      });

      if (backups.length > schedule.maxBackups) {
        const toDelete = backups.slice(schedule.maxBackups);
        for (const backup of toDelete) {
          if (backup.storagePath) {
            const filePath = path.join(BACKUP_STORAGE_PATH, backup.storagePath);
            await fs.unlink(filePath).catch(() => {});
          }
          await db.backup_history.delete({
            where: { id: backup.id },
          });
        }
      }
    }
  }

  private async sendNotification(
    emails: string[],
    status: 'success' | 'failed',
    scheduleName: string,
    details: { duration?: number; fileSize?: number; modules?: string[]; error?: string }
  ): Promise<void> {
    try {
      const title = status === 'success'
        ? `Backup "${scheduleName}" concluído com sucesso`
        : `Falha no backup "${scheduleName}"`;

      const message = status === 'success'
        ? `Backup realizado em ${details.duration ? Math.round(details.duration / 1000) : 0}s. Tamanho: ${details.fileSize ? Math.round(details.fileSize / 1024) : 0}KB. Módulos: ${details.modules?.join(', ')}.`
        : `Erro: ${details.error}`;

      // Log notification (email sending would require external service)
      console.log(`[BackupScheduler] Notification: ${title} - ${message}`);
      
      // If companyId is available, create in-app notification
      // Note: For email notifications, integrate with an email service
    } catch (error) {
      console.error('[BackupScheduler] Error sending notification:', error);
    }
  }
}

// =============================================================================
// Export Singleton
// =============================================================================

export const backupScheduler = new BackupScheduler();
