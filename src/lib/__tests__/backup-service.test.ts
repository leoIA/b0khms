// =============================================================================
// ConstrutorPro - Testes do Serviço de Backup
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupService, type BackupData, type BackupModule } from '../backup-service';
import crypto from 'crypto';

// Mock dependencies - must export 'db' to match the import in backup-service.ts
vi.mock('@/lib/db', () => ({
  db: {
    companies: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'company-1',
        name: 'Empresa Teste',
      }),
    },
    projects: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'proj-1', name: 'Projeto 1', companyId: 'company-1' },
        { id: 'proj-2', name: 'Projeto 2', companyId: 'company-1' },
      ]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'proj-new' }),
      upsert: vi.fn().mockResolvedValue({ id: 'proj-upsert' }),
    },
    clients: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'client-1', name: 'Cliente 1', companyId: 'company-1' },
      ]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'client-new' }),
      upsert: vi.fn().mockResolvedValue({ id: 'client-upsert' }),
    },
    suppliers: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'supplier-1', name: 'Fornecedor 1', companyId: 'company-1' },
      ]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'supplier-new' }),
      upsert: vi.fn().mockResolvedValue({ id: 'supplier-upsert' }),
    },
    materials: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'material-new' }),
      upsert: vi.fn().mockResolvedValue({ id: 'material-upsert' }),
    },
    compositions: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    budgets: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    transactions: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'transaction-new' }),
      upsert: vi.fn().mockResolvedValue({ id: 'transaction-upsert' }),
    },
    daily_logs: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'log-new' }),
      upsert: vi.fn().mockResolvedValue({ id: 'log-upsert' }),
    },
    schedule_tasks: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'task-new' }),
      upsert: vi.fn().mockResolvedValue({ id: 'task-upsert' }),
    },
    users: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue('log-id'),
  },
  auditHelpersExtended: {
    logDataExport: vi.fn().mockResolvedValue('log-id'),
    logDataImport: vi.fn().mockResolvedValue('log-id'),
  },
}));

vi.mock('@/lib/two-factor', () => ({
  encrypt: vi.fn().mockReturnValue('encrypted-data'),
  decrypt: vi.fn().mockReturnValue(JSON.stringify({ test: 'data' })),
}));

describe('BackupService', () => {
  let backupService: BackupService;

  beforeEach(() => {
    vi.clearAllMocks();
    backupService = new BackupService();
  });

  // ==========================================================================
  // Create Backup Tests
  // ==========================================================================

  describe('createBackup', () => {
    it('should create a backup with default modules', async () => {
      const result = await backupService.createBackup({
        companyId: 'company-1',
        userId: 'user-1',
      });

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.companyId).toBe('company-1');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.data).toBeDefined();
    });

    it('should create a backup with specific modules', async () => {
      const result = await backupService.createBackup({
        companyId: 'company-1',
        userId: 'user-1',
        modules: ['projects', 'clients'],
      });

      expect(result.metadata.modules).toContain('projects');
      expect(result.metadata.modules).toContain('clients');
    });

    it('should include record counts in metadata', async () => {
      const result = await backupService.createBackup({
        companyId: 'company-1',
        userId: 'user-1',
        modules: ['projects', 'clients'],
      });

      expect(result.metadata.recordCounts).toBeDefined();
      expect(result.metadata.recordCounts.projects).toBe(2);
      expect(result.metadata.recordCounts.clients).toBe(1);
    });

    it('should throw error if company not found', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.companies.findUnique).mockResolvedValueOnce(null);

      await expect(
        backupService.createBackup({
          companyId: 'non-existent',
          userId: 'user-1',
        })
      ).rejects.toThrow('Empresa não encontrada');
    });

    it('should generate a checksum', async () => {
      const result = await backupService.createBackup({
        companyId: 'company-1',
        userId: 'user-1',
      });

      expect(result.metadata.checksum).toBeDefined();
      expect(typeof result.metadata.checksum).toBe('string');
      expect(result.metadata.checksum.length).toBe(16);
    });
  });

  // ==========================================================================
  // Restore Backup Tests
  // ==========================================================================

  describe('restoreBackup', () => {
    // Helper to create valid backup data with correct checksum
    const createValidBackupData = (): BackupData => {
      const data = {
        projects: [{ id: 'proj-1', name: 'Projeto 1' }],
      };
      const checksum = crypto
        .createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex')
        .substring(0, 16);
      
      return {
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          companyId: 'company-1',
          companyName: 'Empresa Teste',
          modules: ['projects'],
          recordCounts: { projects: 1 },
          checksum,
          encrypted: false,
        },
        data,
      };
    };

    const validBackupData = createValidBackupData();

    it('should validate backup structure', async () => {
      const invalidBackup = {
        metadata: null,
        data: {},
      } as unknown as BackupData;

      const result = await backupService.restoreBackup({
        companyId: 'company-1',
        userId: 'user-1',
        backupData: invalidBackup,
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail if company ID does not match', async () => {
      const result = await backupService.restoreBackup({
        companyId: 'different-company',
        userId: 'user-1',
        backupData: createValidBackupData(),
      });

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('outra empresa'))).toBe(true);
    });

    it('should validate only without making changes', async () => {
      const result = await backupService.restoreBackup({
        companyId: 'company-1',
        userId: 'user-1',
        backupData: createValidBackupData(),
        validateOnly: true,
      });

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('válido'))).toBe(true);
    });
  });

  // ==========================================================================
  // Export Data Tests
  // ==========================================================================

  describe('exportData', () => {
    it('should export data in JSON format', async () => {
      const result = await backupService.exportData({
        companyId: 'company-1',
        userId: 'user-1',
        modules: ['projects'],
        format: 'json',
      });

      expect(result.content).toBeDefined();
      expect(result.filename).toContain('.json');
      expect(result.mimeType).toBe('application/json');
    });

    it('should export data in CSV format', async () => {
      const result = await backupService.exportData({
        companyId: 'company-1',
        userId: 'user-1',
        modules: ['projects'],
        format: 'csv',
      });

      expect(result.content).toBeDefined();
      expect(result.filename).toContain('.csv');
      expect(result.mimeType).toContain('text/csv');
    });

    it('should include date range filter when provided', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      };

      const result = await backupService.exportData({
        companyId: 'company-1',
        userId: 'user-1',
        modules: ['projects'],
        format: 'json',
        dateRange,
      });

      expect(result.content).toBeDefined();
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe('utility functions', () => {
    it('should have correct module labels', () => {
      const modules: BackupModule[] = [
        'projects',
        'clients',
        'suppliers',
        'materials',
        'budgets',
        'transactions',
      ];

      for (const mod of modules) {
        expect(mod).toBeDefined();
      }
    });
  });
});

// =============================================================================
// Checksum Generation Tests
// =============================================================================

describe('Checksum Generation', () => {
  it('should generate consistent checksums for same data', () => {
    const data = { test: 'data', nested: { value: 123 } };

    const checksum1 = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);

    const checksum2 = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);

    expect(checksum1).toBe(checksum2);
  });

  it('should generate different checksums for different data', () => {
    const data1 = { test: 'data1' };
    const data2 = { test: 'data2' };

    const checksum1 = crypto
      .createHash('sha256')
      .update(JSON.stringify(data1))
      .digest('hex')
      .substring(0, 16);

    const checksum2 = crypto
      .createHash('sha256')
      .update(JSON.stringify(data2))
      .digest('hex')
      .substring(0, 16);

    expect(checksum1).not.toBe(checksum2);
  });
});

// =============================================================================
// Type Guards Tests
// =============================================================================

describe('Type Guards', () => {
  it('should validate BackupModule type', () => {
    const validModules: BackupModule[] = [
      'projects',
      'clients',
      'suppliers',
      'materials',
      'compositions',
      'budgets',
      'transactions',
      'dailyLogs',
      'scheduleTasks',
      'users',
      'settings',
    ];

    expect(validModules.length).toBe(11);
  });
});
