// =============================================================================
// ConstrutorPro - API de Backup e Exportação
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { backupService, type BackupModule, type BackupOptions } from '@/lib/backup-service';
import { z } from 'zod';

// =============================================================================
// Validation Schemas
// =============================================================================

const createBackupSchema = z.object({
  modules: z.array(z.enum([
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
  ])).optional(),
  encrypt: z.boolean().optional(),
  encryptionKey: z.string().optional(),
});

const exportDataSchema = z.object({
  modules: z.array(z.enum([
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
  ])).min(1, 'Selecione pelo menos um módulo'),
  format: z.enum(['json', 'csv', 'xlsx']),
  dateRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str)),
  }).optional(),
});

// =============================================================================
// GET /api/backup - Get backup info and list available modules
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const companyId = authResult.context?.companyId;
    const userId = authResult.context?.user.id;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Usuário não associado a uma empresa' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get module statistics
    if (action === 'stats') {
      const stats = await backupService.createBackup({
        companyId,
        userId: userId!,
        modules: undefined,
      });

      return NextResponse.json({
        success: true,
        data: {
          modules: stats.metadata.modules.map(m => ({
            name: m,
            label: getModuleLabel(m),
            count: stats.metadata.recordCounts[m],
          })),
          totalRecords: Object.values(stats.metadata.recordCounts).reduce((a, b) => a + b, 0),
        },
      });
    }

    // Default: return available modules info
    const modules: { name: BackupModule; label: string; description: string }[] = [
      { name: 'projects', label: 'Projetos', description: 'Projetos com clientes, valores e progresso' },
      { name: 'clients', label: 'Clientes', description: 'Cadastro de clientes pessoa física e jurídica' },
      { name: 'suppliers', label: 'Fornecedores', description: 'Cadastro de fornecedores' },
      { name: 'materials', label: 'Materiais', description: 'Materiais e estoque' },
      { name: 'compositions', label: 'Composições', description: 'Composições de custos' },
      { name: 'budgets', label: 'Orçamentos', description: 'Orçamentos e itens' },
      { name: 'transactions', label: 'Transações', description: 'Movimentação financeira' },
      { name: 'dailyLogs', label: 'Diário de Obra', description: 'Registros diários de obra' },
      { name: 'scheduleTasks', label: 'Cronograma', description: 'Tarefas e cronograma físico' },
      { name: 'users', label: 'Usuários', description: 'Usuários da empresa' },
      { name: 'settings', label: 'Configurações', description: 'Configurações da empresa' },
    ];

    return NextResponse.json({
      success: true,
      data: {
        modules,
        supportedFormats: ['json', 'csv', 'xlsx'],
        maxBackupSize: '50MB',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/backup:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/backup - Create backup or export data
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const companyId = authResult.context?.companyId;
    const userId = authResult.context?.user.id;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Usuário não associado a uma empresa' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Create backup
    if (action === 'backup') {
      const parsed = createBackupSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const options: BackupOptions = {
        companyId,
        userId: userId!,
        modules: parsed.data.modules,
        encrypt: parsed.data.encrypt,
        encryptionKey: parsed.data.encryptionKey,
      };

      const backup = await backupService.createBackup(options);

      return NextResponse.json({
        success: true,
        data: backup,
        message: `Backup criado com ${Object.values(backup.metadata.recordCounts).reduce((a, b) => a + b, 0)} registros`,
      });
    }

    // Export data
    if (action === 'export') {
      const parsed = exportDataSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const result = await backupService.exportData({
        companyId,
        userId: userId!,
        modules: parsed.data.modules,
        format: parsed.data.format,
        dateRange: parsed.data.dateRange,
      });

      // Return file as download
      const content = typeof result.content === 'string' 
        ? Buffer.from(result.content) 
        : result.content;
      return new NextResponse(new Uint8Array(content), {
        headers: {
          'Content-Type': result.mimeType,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Ação não reconhecida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in POST /api/backup:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function getModuleLabel(module: BackupModule): string {
  const labels: Record<BackupModule, string> = {
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
  return labels[module] || module;
}
