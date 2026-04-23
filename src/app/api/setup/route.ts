import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SetupConfig {
  databaseUrl: string;
  nextauthSecret?: string;
  mercadoPagoAccessToken?: string;
  mercadoPagoPublicKey?: string;
}

/**
 * API para salvar configurações iniciais do sistema
 * - Salva DATABASE_URL e outras variáveis
 * - Gera NEXTAUTH_SECRET se não fornecido
 * - Cria arquivo .env.local
 * - Marca sistema como configurado
 */
export async function POST(request: NextRequest) {
  try {
    const body: SetupConfig = await request.json();
    const { databaseUrl, nextauthSecret, mercadoPagoAccessToken, mercadoPagoPublicKey } = body;

    // Validações
    if (!databaseUrl) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_URL é obrigatória' },
        { status: 400 }
      );
    }

    // Validar formato da URL
    const validDbPrefixes = ['postgresql://', 'postgres://', 'mysql://', 'sqlite:', 'file:'];
    const isValidDbUrl = validDbPrefixes.some(prefix => databaseUrl.startsWith(prefix));
    
    if (!isValidDbUrl) {
      return NextResponse.json(
        { success: false, error: 'URL do banco inválida' },
        { status: 400 }
      );
    }

    // Gerar NEXTAUTH_SECRET se não fornecido
    const secret = nextauthSecret || crypto.randomBytes(32).toString('base64');

    // Criar conteúdo do .env.local
    const envContent = `# Configuração gerada pelo Setup Wizard
# Data: ${new Date().toISOString()}

# Banco de Dados
DATABASE_URL="${databaseUrl}"

# NextAuth
NEXTAUTH_SECRET="${secret}"
NEXTAUTH_URL="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}"

# MercadoPago (opcional)
${mercadoPagoAccessToken ? `MERCADOPAGO_ACCESS_TOKEN="${mercadoPagoAccessToken}"` : '# MERCADOPAGO_ACCESS_TOKEN=""'}
${mercadoPagoPublicKey ? `MERCADOPAGO_PUBLIC_KEY="${mercadoPagoPublicKey}"` : '# MERCADOPAGO_PUBLIC_KEY=""'}
`;

    // Salvar arquivo .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    fs.writeFileSync(envPath, envContent);

    // Criar arquivo de configuração para marcar como configurado
    const configPath = path.join(process.cwd(), 'config.json');
    const config = {
      configured: true,
      databaseUrl: databaseUrl.replace(/:[^:@]+@/, ':****@'), // Ocultar senha
      configuredAt: new Date().toISOString(),
      hasMercadoPago: !!(mercadoPagoAccessToken && mercadoPagoPublicKey),
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Tentar rodar migrações automaticamente
    let migrationResult = { success: false, message: '' };
    
    try {
      // Rodar prisma generate e migrate deploy
      await execAsync('npx prisma generate', { cwd: process.cwd() });
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', { cwd: process.cwd() });
      
      migrationResult = {
        success: true,
        message: 'Migrações executadas com sucesso',
      };
      
      console.log('Migration output:', stdout);
      if (stderr) console.log('Migration stderr:', stderr);
    } catch (migrationError) {
      console.error('Erro ao rodar migrações:', migrationError);
      migrationResult = {
        success: false,
        message: 'Migrações precisam ser executadas manualmente',
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração salva com sucesso',
      migration: migrationResult,
      note: 'Reinicie o servidor para aplicar as configurações',
    });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao salvar configuração' },
      { status: 500 }
    );
  }
}

/**
 * API para redefinir configuração (apenas para desenvolvimento)
 */
export async function DELETE() {
  try {
    // Remover arquivos de configuração
    const configPath = path.join(process.cwd(), 'config.json');
    const envPath = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    
    // Não remover .env.local por segurança - apenas avisar
    // if (fs.existsSync(envPath)) {
    //   fs.unlinkSync(envPath);
    // }

    return NextResponse.json({
      success: true,
      message: 'Configuração redefinida. Execute novamente o setup.',
    });
  } catch (error) {
    console.error('Erro ao redefinir configuração:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao redefinir configuração' },
      { status: 500 }
    );
  }
}
