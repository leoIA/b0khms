import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * API para verificar o status completo do sistema
 * Verifica:
 * 1. Se DATABASE_URL está configurada
 * 2. Se consegue conectar ao banco
 * 3. Se as tabelas existem
 * 4. Se existe usuário admin
 */

interface SetupStatus {
  configured: boolean;
  hasDatabaseUrl: boolean;
  databaseConnected: boolean;
  tablesExist: boolean;
  hasAdminUser: boolean;
  needsSetup: boolean;
  message: string;
  details?: {
    databaseType?: string;
    tableCount?: number;
    userCount?: number;
  };
}

// Função para testar conexão com o banco
async function testDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.$disconnect();
    return { connected: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return { connected: false, error: errorMessage };
  }
}

// Função para verificar se as tabelas existem
async function checkTablesExist(): Promise<{ exist: boolean; count: number; error?: string }> {
  try {
    const prisma = new PrismaClient();
    
    // Tentar contar registros em uma tabela principal
    // Se funcionar, as tabelas existem
    const userCount = await prisma.users.count();
    
    await prisma.$disconnect();
    
    return { exist: true, count: userCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return { exist: false, count: 0, error: errorMessage };
  }
}

// Função para verificar se existe usuário admin
async function checkAdminUser(): Promise<{ exists: boolean; count: number }> {
  try {
    const prisma = new PrismaClient();
    
    // Verificar se existe algum usuário com role de admin
    const adminCount = await prisma.users.count({
      where: {
        OR: [
          { role: 'master_admin' },
          { role: 'company_admin' },
        ],
      },
    });
    
    await prisma.$disconnect();
    
    return { exists: adminCount > 0, count: adminCount };
  } catch {
    return { exists: false, count: 0 };
  }
}

// Extrair tipo de banco da URL
function getDatabaseType(url: string): string {
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    return 'PostgreSQL';
  }
  if (url.startsWith('mysql://')) {
    return 'MySQL';
  }
  if (url.startsWith('sqlite:') || url.startsWith('file:')) {
    return 'SQLite';
  }
  return 'Desconhecido';
}

export async function GET() {
  const status: SetupStatus = {
    configured: false,
    hasDatabaseUrl: false,
    databaseConnected: false,
    tablesExist: false,
    hasAdminUser: false,
    needsSetup: true,
    message: '',
  };

  try {
    // 1. Verificar se DATABASE_URL existe nas variáveis de ambiente
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      status.hasDatabaseUrl = false;
      status.message = 'DATABASE_URL não configurada. Configure as variáveis de ambiente.';
      return NextResponse.json(status);
    }

    status.hasDatabaseUrl = true;
    status.details = {
      databaseType: getDatabaseType(databaseUrl),
    };

    // 2. Verificar arquivo de configuração local
    const configPath = path.join(process.cwd(), 'config.json');
    let localConfigExists = false;
    
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        localConfigExists = config.configured === true;
      } catch {
        // Ignorar erros de leitura
      }
    }

    // 3. Testar conexão com o banco
    const dbTest = await testDatabaseConnection();
    status.databaseConnected = dbTest.connected;

    if (!dbTest.connected) {
      status.message = `Não foi possível conectar ao banco de dados: ${dbTest.error}`;
      return NextResponse.json(status);
    }

    // 4. Verificar se as tabelas existem
    const tablesCheck = await checkTablesExist();
    status.tablesExist = tablesCheck.exist;
    status.details = {
      ...status.details,
      tableCount: tablesCheck.count,
    };

    if (!tablesCheck.exist) {
      status.message = 'Banco de dados conectado, mas as tabelas não existem. Execute as migrações.';
      return NextResponse.json(status);
    }

    // 5. Verificar se existe usuário admin
    const adminCheck = await checkAdminUser();
    status.hasAdminUser = adminCheck.exists;
    status.details = {
      ...status.details,
      userCount: adminCheck.count,
    };

    if (!adminCheck.exists) {
      status.message = 'Sistema configurado, mas não existe usuário administrador. Crie um admin.';
      status.needsSetup = true;
      return NextResponse.json(status);
    }

    // 6. Sistema totalmente configurado
    status.configured = true;
    status.needsSetup = false;
    status.message = 'Sistema configurado e pronto para uso.';

    // Criar arquivo de configuração local se não existir
    if (!localConfigExists) {
      const config = {
        configured: true,
        databaseType: status.details?.databaseType,
        configuredAt: new Date().toISOString(),
        viaEnv: true,
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    return NextResponse.json(status);

  } catch (error) {
    console.error('Erro ao verificar status do sistema:', error);
    status.message = 'Erro ao verificar configuração do sistema.';
    return NextResponse.json(status);
  }
}
