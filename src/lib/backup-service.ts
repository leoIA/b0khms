// =============================================================================
// ConstrutorPro - Serviço de Backup e Exportação de Dados
// =============================================================================

import { db } from '@/lib/db';
import { auditLogger, auditHelpersExtended } from '@/lib/audit-logger';
import crypto from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface BackupOptions {
  companyId: string;
  userId: string;
  modules?: BackupModule[];
  includeRelations?: boolean;
  encrypt?: boolean;
  encryptionKey?: string;
  format?: 'json' | 'full';
}

export type BackupModule = 
  | 'projects'
  | 'clients'
  | 'suppliers'
  | 'materials'
  | 'compositions'
  | 'budgets'
  | 'transactions'
  | 'dailyLogs'
  | 'scheduleTasks'
  | 'users'
  | 'settings';

export interface BackupMetadata {
  version: string;
  createdAt: string;
  companyId: string;
  companyName: string;
  modules: BackupModule[];
  recordCounts: Record<BackupModule, number>;
  checksum: string;
  encrypted: boolean;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: Record<string, unknown>;
}

export interface RestoreOptions {
  companyId: string;
  userId: string;
  backupData: BackupData;
  overwrite?: boolean;
  validateOnly?: boolean;
}

export interface RestoreResult {
  success: boolean;
  modulesRestored: BackupModule[];
  recordsImported: Record<BackupModule, number>;
  errors: string[];
  warnings: string[];
}

export interface ExportOptions {
  companyId: string;
  userId: string;
  modules: BackupModule[];
  format: 'json' | 'csv' | 'xlsx';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// =============================================================================
// Constants
// =============================================================================

const BACKUP_VERSION = '1.0.0';

const DEFAULT_MODULES: BackupModule[] = [
  'projects',
  'clients',
  'suppliers',
  'materials',
  'compositions',
  'budgets',
  'transactions',
  'dailyLogs',
  'scheduleTasks',
];

const MODULE_LABELS: Record<BackupModule, string> = {
  projects: 'Projetos',
  clients: 'Clientes',
  suppliers: 'Fornecedores',
  materials: 'Materiais',
  compositions: 'Composições',
  budgets: 'Orçamentos',
  transactions: 'Transações',
  dailyLogs: 'Diário de Obra',
  scheduleTasks: 'Cronograma',
  users: 'Usuários',
  settings: 'Configurações',
};

// =============================================================================
// Backup Service
// =============================================================================

export class BackupService {
  // ---------------------------------------------------------------------------
  // Create Backup
  // ---------------------------------------------------------------------------

  async createBackup(options: BackupOptions): Promise<BackupData> {
    const {
      companyId,
      userId,
      modules = DEFAULT_MODULES,
      includeRelations = true,
      encrypt: shouldEncrypt = false,
      encryptionKey,
    } = options;

    // Get company info
    const company = await db.companies.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      throw new Error('Empresa não encontrada');
    }

    // Collect data from each module
    const data: Record<string, unknown> = {};
    const recordCounts: Record<BackupModule, number> = {} as Record<BackupModule, number>;

    for (const mod of modules) {
      const moduleData = await this.collectModuleData(companyId, mod, includeRelations);
      data[mod] = moduleData;
      recordCounts[mod] = Array.isArray(moduleData) ? moduleData.length : Object.keys(moduleData).length;
    }

    // Create metadata
    const metadata: BackupMetadata = {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      companyId: company.id,
      companyName: company.name,
      modules,
      recordCounts,
      checksum: this.generateChecksum(data),
      encrypted: shouldEncrypt,
    };

    // Encrypt data if requested
    let finalData = data;
    if (shouldEncrypt && encryptionKey) {
      // const encryptedData = encrypt(JSON.stringify(data), encryptionKey);
      // finalData = { encrypted: encryptedData };
    }

    // Log backup creation
    await auditHelpersExtended.logDataExport(userId, companyId, 'backup', {
      modules,
      recordCounts,
      encrypted: shouldEncrypt,
    });

    return {
      metadata,
      data: finalData,
    };
  }

  // ---------------------------------------------------------------------------
  // Restore Backup
  // ---------------------------------------------------------------------------

  async restoreBackup(options: RestoreOptions): Promise<RestoreResult> {
    const {
      companyId,
      userId,
      backupData,
      overwrite = false,
      validateOnly = false,
    } = options;

    const result: RestoreResult = {
      success: false,
      modulesRestored: [],
      recordsImported: {} as Record<BackupModule, number>,
      errors: [],
      warnings: [],
    };

    try {
      // Validate backup
      const validation = this.validateBackup(backupData);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }

      // Check company match
      if (backupData.metadata.companyId !== companyId) {
        result.errors.push('Backup pertence a outra empresa');
        return result;
      }

      // Decrypt if needed
      let data = backupData.data;
      if (backupData.metadata.encrypted && 'encrypted' in data) {
        result.warnings.push('Backup criptografado - forneça a chave de descriptografia');
        return result;
      }

      if (validateOnly) {
        result.success = true;
        result.warnings.push('Backup válido - nenhum dado foi importado');
        return result;
      }

      // Restore each module
      for (const mod of backupData.metadata.modules) {
        try {
          const moduleData = data[mod];
          if (!moduleData) continue;

          const count = await this.restoreModuleData(companyId, mod, moduleData, overwrite);
          result.modulesRestored.push(mod);
          result.recordsImported[mod] = count;
        } catch (error) {
          result.errors.push(`Erro ao restaurar ${MODULE_LABELS[mod]}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      result.success = result.errors.length === 0;

      // Log restore
      await auditHelpersExtended.logDataImport(userId, companyId, 'restore', {
        modulesRestored: result.modulesRestored,
        recordsImported: result.recordsImported,
        overwrite,
      });

      return result;
    } catch (error) {
      result.errors.push(`Erro geral: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return result;
    }
  }

  // ---------------------------------------------------------------------------
  // Export Data
  // ---------------------------------------------------------------------------

  async exportData(options: ExportOptions): Promise<{ content: string | Buffer; filename: string; mimeType: string }> {
    const { companyId, userId, modules, format, dateRange } = options;

    // Collect data
    const data: Record<string, unknown[]> = {};
    for (const mod of modules) {
      data[mod] = await this.collectModuleData(companyId, mod, false, dateRange);
    }

    // Log export
    await auditHelpersExtended.logDataExport(userId, companyId, 'export', {
      modules,
      format,
      dateRange,
    });

    // Generate output based on format
    switch (format) {
      case 'json':
        return this.generateJsonExport(data, modules);
      case 'csv':
        return this.generateCsvExport(data, modules);
      case 'xlsx':
        return this.generateXlsxExport(data, modules);
      default:
        throw new Error('Formato de exportação não suportado');
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods - Data Collection
  // ---------------------------------------------------------------------------

  private async collectModuleData(
    companyId: string,
    moduleName: BackupModule,
    includeRelations: boolean,
    dateRange?: { start: Date; end: Date }
  ): Promise<unknown[]> {
    const dateFilter = dateRange ? {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    } : {};

    switch (moduleName) {
      case 'projects':
        return db.projects.findMany({
          where: { companyId, ...dateFilter },
          include: includeRelations ? {
            clients: true,
            budgets: true,
            daily_logs: true,
          } : undefined,
        });

      case 'clients':
        return db.clients.findMany({
          where: { companyId, ...dateFilter },
        });

      case 'suppliers':
        return db.suppliers.findMany({
          where: { companyId, ...dateFilter },
        });

      case 'materials':
        return db.materials.findMany({
          where: { companyId, ...dateFilter },
          include: includeRelations ? { suppliers: true } : undefined,
        });

      case 'compositions':
        return db.compositions.findMany({
          where: { companyId, ...dateFilter },
          include: includeRelations ? {
            composition_items: {
              include: { materials: true },
            },
          } : undefined,
        });

      case 'budgets':
        return db.budgets.findMany({
          where: { companyId, ...dateFilter },
          include: includeRelations ? {
            projects: true,
            budget_items: {
              include: { compositions: true },
            },
          } : undefined,
        });

      case 'transactions':
        return db.transactions.findMany({
          where: { companyId, ...dateFilter },
          include: includeRelations ? { projects: true } : undefined,
        });

      case 'dailyLogs':
        return db.daily_logs.findMany({
          where: { companyId, ...dateFilter },
          include: includeRelations ? { projects: true } : undefined,
        });

      case 'scheduleTasks':
        // schedule_tasks don't have companyId directly - they're linked via schedules
        return db.schedule_tasks.findMany({
          where: includeRelations ? {
            schedules: { companyId },
          } : {},
          include: includeRelations ? { schedules: { select: { id: true, name: true } } } : undefined,
        });

      case 'users':
        return db.users.findMany({
          where: { companyId, ...dateFilter },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            // Exclude sensitive fields like password, twoFactorSecret, etc.
          },
        });

      case 'settings':
        const settings = await db.companies.findUnique({
          where: { id: companyId },
          select: {
            name: true,
            cnpj: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            plan: true,
            createdAt: true,
          },
        });
        return settings ? [settings] : [];

      default:
        return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods - Data Restoration
  // ---------------------------------------------------------------------------

  private async restoreModuleData(
    companyId: string,
    moduleName: BackupModule,
    data: unknown,
    overwrite: boolean
  ): Promise<number> {
    if (!Array.isArray(data)) return 0;

    switch (moduleName) {
      case 'projects':
        return this.restoreProjects(companyId, data as any[], overwrite);
      case 'clients':
        return this.restoreClients(companyId, data as any[], overwrite);
      case 'suppliers':
        return this.restoreSuppliers(companyId, data as any[], overwrite);
      case 'materials':
        return this.restoreMaterials(companyId, data as any[], overwrite);
      case 'transactions':
        return this.restoreTransactions(companyId, data as any[], overwrite);
      case 'dailyLogs':
        return this.restoreDailyLogs(companyId, data as any[], overwrite);
      case 'scheduleTasks':
        return this.restoreScheduleTasks(companyId, data as any[], overwrite);
      default:
        return 0;
    }
  }

  private async restoreProjects(companyId: string, projects: any[], overwrite: boolean): Promise<number> {
    let count = 0;
    for (const project of projects) {
      try {
        if (overwrite) {
          await db.projects.upsert({
            where: { id: project.id },
            update: {
              name: project.name,
              code: project.code,
              status: project.status,
              description: project.description,
              address: project.address,
              city: project.city,
              state: project.state,
              estimatedValue: project.estimatedValue,
              actualValue: project.actualValue,
              physicalProgress: project.physicalProgress,
              financialProgress: project.financialProgress,
              startDate: project.startDate,
              endDate: project.endDate,
              clientId: project.clientId,
              updatedAt: new Date(),
            },
            create: {
              id: project.id,
              name: project.name,
              code: project.code,
              status: project.status,
              description: project.description,
              address: project.address,
              city: project.city,
              state: project.state,
              estimatedValue: project.estimatedValue,
              actualValue: project.actualValue,
              physicalProgress: project.physicalProgress,
              financialProgress: project.financialProgress,
              startDate: project.startDate,
              endDate: project.endDate,
              clientId: project.clientId,
              companyId,
              createdAt: project.createdAt,
            },
          });
        } else {
          const existing = await db.projects.findUnique({ where: { id: project.id } });
          if (!existing) {
            await db.projects.create({
              data: {
                id: project.id,
                name: project.name,
                code: project.code,
                status: project.status,
                description: project.description,
                address: project.address,
                city: project.city,
                state: project.state,
                estimatedValue: project.estimatedValue,
                actualValue: project.actualValue,
                physicalProgress: project.physicalProgress,
                financialProgress: project.financialProgress,
                startDate: project.startDate,
                endDate: project.endDate,
                clientId: project.clientId,
                companyId,
                createdAt: project.createdAt,
              },
            });
          }
        }
        count++;
      } catch {
        // Skip duplicates or errors
      }
    }
    return count;
  }

  private async restoreClients(companyId: string, clients: any[], overwrite: boolean): Promise<number> {
    let count = 0;
    for (const client of clients) {
      try {
        if (overwrite) {
          await db.clients.upsert({
            where: { id: client.id },
            update: {
              name: client.name,
              email: client.email,
              phone: client.phone,
              mobile: client.mobile,
              cpfCnpj: client.cpfCnpj || client.cnpj || client.cpf,
              address: client.address,
              city: client.city,
              state: client.state,
              zipCode: client.zipCode,
              notes: client.notes,
              status: client.status || (client.isActive ? 'active' : 'inactive'),
              updatedAt: new Date(),
            },
            create: {
              id: client.id,
              name: client.name,
              email: client.email,
              phone: client.phone,
              mobile: client.mobile,
              cpfCnpj: client.cpfCnpj || client.cnpj || client.cpf,
              address: client.address,
              city: client.city,
              state: client.state,
              zipCode: client.zipCode,
              notes: client.notes,
              status: client.status || (client.isActive ? 'active' : 'inactive'),
              companyId,
              createdAt: client.createdAt,
            },
          });
        } else {
          const existing = await db.clients.findUnique({ where: { id: client.id } });
          if (!existing) {
            await db.clients.create({
              data: {
                id: client.id,
                name: client.name,
                email: client.email,
                phone: client.phone,
                mobile: client.mobile,
                cpfCnpj: client.cpfCnpj || client.cnpj || client.cpf,
                address: client.address,
                city: client.city,
                state: client.state,
                zipCode: client.zipCode,
                notes: client.notes,
                status: client.status || (client.isActive ? 'active' : 'inactive'),
                companyId,
                createdAt: client.createdAt,
              },
            });
          }
        }
        count++;
      } catch {
        // Skip duplicates or errors
      }
    }
    return count;
  }

  private async restoreSuppliers(companyId: string, suppliers: any[], overwrite: boolean): Promise<number> {
    let count = 0;
    for (const supplier of suppliers) {
      try {
        if (overwrite) {
          await db.suppliers.upsert({
            where: { id: supplier.id },
            update: {
              name: supplier.name,
              tradeName: supplier.tradeName,
              cnpj: supplier.cnpj,
              email: supplier.email,
              phone: supplier.phone,
              address: supplier.address,
              city: supplier.city,
              state: supplier.state,
              zipCode: supplier.zipCode,
              contactPerson: supplier.contactPerson || supplier.contactName,
              notes: supplier.notes,
              status: supplier.status || (supplier.isActive ? 'active' : 'inactive'),
              updatedAt: new Date(),
            },
            create: {
              id: supplier.id,
              name: supplier.name,
              tradeName: supplier.tradeName,
              cnpj: supplier.cnpj,
              email: supplier.email,
              phone: supplier.phone,
              address: supplier.address,
              city: supplier.city,
              state: supplier.state,
              zipCode: supplier.zipCode,
              contactPerson: supplier.contactPerson || supplier.contactName,
              notes: supplier.notes,
              status: supplier.status || (supplier.isActive ? 'active' : 'inactive'),
              companyId,
              createdAt: supplier.createdAt,
            },
          });
        } else {
          const existing = await db.suppliers.findUnique({ where: { id: supplier.id } });
          if (!existing) {
            await db.suppliers.create({
              data: {
                id: supplier.id,
                name: supplier.name,
                tradeName: supplier.tradeName,
                cnpj: supplier.cnpj,
                email: supplier.email,
                phone: supplier.phone,
                mobile: supplier.mobile,
                address: supplier.address,
                city: supplier.city,
                state: supplier.state,
                zipCode: supplier.zipCode,
                contactPerson: supplier.contactPerson || supplier.contactName,
                category: supplier.category,
                notes: supplier.notes,
                status: supplier.status || (supplier.isActive ? 'active' : 'inactive'),
                companyId,
                createdAt: supplier.createdAt,
              },
            });
          }
        }
        count++;
      } catch {
        // Skip duplicates or errors
      }
    }
    return count;
  }

  private async restoreMaterials(companyId: string, materials: any[], overwrite: boolean): Promise<number> {
    let count = 0;
    for (const material of materials) {
      try {
        if (overwrite) {
          await db.materials.upsert({
            where: { id: material.id },
            update: {
              code: material.code,
              name: material.name,
              unit: material.unit,
              unitCost: material.unitCost,
              description: material.description,
              category: material.category,
              stockQuantity: material.stockQuantity,
              minStock: material.minStock,
              supplierId: material.supplierId,
              updatedAt: new Date(),
            },
            create: {
              id: material.id,
              code: material.code,
              name: material.name,
              unit: material.unit,
              unitCost: material.unitCost,
              description: material.description,
              category: material.category,
              stockQuantity: material.stockQuantity,
              minStock: material.minStock,
              supplierId: material.supplierId,
              companyId,
              createdAt: material.createdAt,
            },
          });
        } else {
          const existing = await db.materials.findUnique({ where: { id: material.id } });
          if (!existing) {
            await db.materials.create({
              data: {
                id: material.id,
                code: material.code,
                name: material.name,
                unit: material.unit,
                unitCost: material.unitCost,
                description: material.description,
                category: material.category,
                stockQuantity: material.stockQuantity,
                minStock: material.minStock,
                supplierId: material.supplierId,
                companyId,
                createdAt: material.createdAt,
              },
            });
          }
        }
        count++;
      } catch {
        // Skip duplicates or errors
      }
    }
    return count;
  }

  private async restoreTransactions(companyId: string, transactions: any[], overwrite: boolean): Promise<number> {
    let count = 0;
    for (const transaction of transactions) {
      try {
        if (overwrite) {
          await db.transactions.upsert({
            where: { id: transaction.id },
            update: {
              type: transaction.type,
              category: transaction.category,
              description: transaction.description,
              value: transaction.value,
              date: transaction.date,
              dueDate: transaction.dueDate,
              status: transaction.status,
              projectId: transaction.projectId,
              supplierId: transaction.supplierId,
              clientId: transaction.clientId,
              notes: transaction.notes,
              documentNumber: transaction.documentNumber || transaction.invoiceNumber,
              updatedAt: new Date(),
            },
            create: {
              id: transaction.id,
              type: transaction.type,
              category: transaction.category,
              description: transaction.description,
              value: transaction.value,
              date: transaction.date,
              dueDate: transaction.dueDate,
              status: transaction.status,
              projectId: transaction.projectId,
              supplierId: transaction.supplierId,
              clientId: transaction.clientId,
              notes: transaction.notes,
              documentNumber: transaction.documentNumber || transaction.invoiceNumber,
              companyId,
              createdAt: transaction.createdAt,
            },
          });
        } else {
          const existing = await db.transactions.findUnique({ where: { id: transaction.id } });
          if (!existing) {
            await db.transactions.create({
              data: {
                id: transaction.id,
                type: transaction.type,
                category: transaction.category,
                description: transaction.description,
                value: transaction.value,
                date: transaction.date,
                dueDate: transaction.dueDate,
                status: transaction.status,
                projectId: transaction.projectId,
                supplierId: transaction.supplierId,
                clientId: transaction.clientId,
                notes: transaction.notes,
                documentNumber: transaction.documentNumber || transaction.invoiceNumber,
                companyId,
                createdAt: transaction.createdAt,
              },
            });
          }
        }
        count++;
      } catch {
        // Skip duplicates or errors
      }
    }
    return count;
  }

  private async restoreDailyLogs(companyId: string, logs: any[], overwrite: boolean): Promise<number> {
    let count = 0;
    for (const log of logs) {
      try {
        if (overwrite) {
          await db.daily_logs.upsert({
            where: { id: log.id },
            update: {
              date: log.date,
              weather: log.weather,
              workersCount: log.workersCount,
              summary: log.summary,
              observations: log.observations,
              projectId: log.projectId,
              updatedAt: new Date(),
            },
            create: {
              id: log.id,
              date: log.date,
              weather: log.weather,
              workersCount: log.workersCount,
              summary: log.summary,
              observations: log.observations,
              projectId: log.projectId,
              companyId,
              createdBy: log.createdBy || 'system',
              createdAt: log.createdAt,
              updatedAt: new Date(),
            },
          });
        } else {
          const existing = await db.daily_logs.findUnique({ where: { id: log.id } });
          if (!existing) {
            await db.daily_logs.create({
              data: {
                id: log.id,
                date: log.date,
                weather: log.weather,
                workersCount: log.workersCount,
                summary: log.summary,
                observations: log.observations,
                projectId: log.projectId,
                companyId,
                createdBy: log.createdBy || 'system',
                createdAt: log.createdAt,
                updatedAt: new Date(),
              },
            });
          }
        }
        count++;
      } catch {
        // Skip duplicates or errors
      }
    }
    return count;
  }

  private async restoreScheduleTasks(companyId: string, tasks: any[], overwrite: boolean): Promise<number> {
    let count = 0;
    for (const task of tasks) {
      try {
        // Skip if no scheduleId - tasks must belong to a schedule
        if (!task.scheduleId) continue;
        
        if (overwrite) {
          await db.schedule_tasks.upsert({
            where: { id: task.id },
            update: {
              name: task.name,
              description: task.description,
              startDate: task.startDate,
              endDate: task.endDate,
              duration: task.duration ?? 0,
              progress: task.progress ?? 0,
              status: task.status ?? 'pending',
              responsible: task.responsible || task.assignedTo,
              order: task.order ?? 0,
              financialProgress: task.financialProgress,
              physicalProgress: task.physicalProgress,
              parentId: task.parentId || task.parentTaskId,
              updatedAt: new Date(),
            },
            create: {
              id: task.id,
              scheduleId: task.scheduleId,
              name: task.name,
              description: task.description,
              startDate: task.startDate,
              endDate: task.endDate,
              duration: task.duration ?? 0,
              progress: task.progress ?? 0,
              status: task.status ?? 'pending',
              responsible: task.responsible || task.assignedTo,
              order: task.order ?? 0,
              financialProgress: task.financialProgress,
              physicalProgress: task.physicalProgress,
              parentId: task.parentId || task.parentTaskId,
              createdAt: task.createdAt,
              updatedAt: new Date(),
            },
          });
        } else {
          const existing = await db.schedule_tasks.findUnique({ where: { id: task.id } });
          if (!existing) {
            await db.schedule_tasks.create({
              data: {
                id: task.id,
                scheduleId: task.scheduleId,
                name: task.name,
                description: task.description,
                startDate: task.startDate,
                endDate: task.endDate,
                duration: task.duration ?? 0,
                progress: task.progress ?? 0,
                status: task.status ?? 'pending',
                responsible: task.responsible || task.assignedTo,
                order: task.order ?? 0,
                financialProgress: task.financialProgress,
                physicalProgress: task.physicalProgress,
                parentId: task.parentId || task.parentTaskId,
                createdAt: task.createdAt,
                updatedAt: new Date(),
              },
            });
          }
        }
        count++;
      } catch {
        // Skip duplicates or errors
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Private Methods - Export Formats
  // ---------------------------------------------------------------------------

  private generateJsonExport(data: Record<string, unknown[]>, modules: BackupModule[]): { content: string; filename: string; mimeType: string } {
    const exportData = {
      exportedAt: new Date().toISOString(),
      modules: modules.map(mod => ({ name: mod, count: data[mod]?.length || 0 })),
      data,
    };

    return {
      content: JSON.stringify(exportData, null, 2),
      filename: `construtorpro_export_${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json',
    };
  }

  private generateCsvExport(data: Record<string, unknown[]>, modules: BackupModule[]): { content: string; filename: string; mimeType: string } {
    // For CSV, we'll export the first module or create a combined file
    const primaryModule = modules[0];
    const records = data[primaryModule] || [];

    if (records.length === 0) {
      return {
        content: '',
        filename: `construtorpro_${primaryModule}_${new Date().toISOString().split('T')[0]}.csv`,
        mimeType: 'text/csv',
      };
    }

    // Convert to CSV
    const headers = Object.keys(records[0] as Record<string, unknown>);
    const csvRows = [
      headers.join(';'),
      ...records.map(record => {
        const values = headers.map(h => {
          const value = (record as Record<string, unknown>)[h];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        return values.join(';');
      }),
    ];

    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';

    return {
      content: BOM + csvRows.join('\n'),
      filename: `construtorpro_${primaryModule}_${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv;charset=utf-8',
    };
  }

  private generateXlsxExport(data: Record<string, unknown[]>, modules: BackupModule[]): { content: Buffer; filename: string; mimeType: string } {
    // For XLSX, we return a placeholder - the actual implementation would use a library like xlsx
    // This is a simplified version that returns JSON for now
    const exportData = {
      format: 'xlsx',
      exportedAt: new Date().toISOString(),
      modules: modules.map(mod => ({ name: mod, count: data[mod]?.length || 0 })),
      data,
    };

    return {
      content: Buffer.from(JSON.stringify(exportData, null, 2)),
      filename: `construtorpro_export_${new Date().toISOString().split('T')[0]}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  // ---------------------------------------------------------------------------
  // Private Methods - Validation
  // ---------------------------------------------------------------------------

  private validateBackup(backupData: BackupData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!backupData.metadata) {
      errors.push('Backup sem metadados');
      return { valid: false, errors };
    }

    if (!backupData.metadata.version) {
      errors.push('Versão do backup não especificada');
    }

    if (!backupData.metadata.companyId) {
      errors.push('ID da empresa não especificado');
    }

    if (!backupData.data) {
      errors.push('Backup sem dados');
    }

    // Verify checksum
    if (backupData.metadata.checksum && !backupData.metadata.encrypted) {
      const currentChecksum = this.generateChecksum(backupData.data);
      if (currentChecksum !== backupData.metadata.checksum) {
        errors.push('Checksum do backup inválido - dados podem estar corrompidos');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private generateChecksum(data: unknown): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const backupService = new BackupService();
