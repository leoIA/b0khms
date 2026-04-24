import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const execAsync = promisify(exec);

interface SetupConfig {
  // Dados do banco
  databaseUrl: string;
  // Dados do NextAuth
  nextauthSecret?: string;
  nextauthUrl?: string;
  // Dados do admin
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  companyName: string;
  companyCnpj: string;
  companyEmail: string;
  // Opcionais
  mercadoPagoAccessToken?: string;
  mercadoPagoPublicKey?: string;
}

interface SetupStep {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
}

/**
 * API para realizar o setup inicial completo do sistema
 */
export async function POST(request: NextRequest) {
  const steps: SetupStep[] = [];
  
  try {
    const body: SetupConfig = await request.json();
    const {
      databaseUrl,
      nextauthSecret,
      nextauthUrl,
      adminName,
      adminEmail,
      adminPassword,
      companyName,
      companyCnpj,
      companyEmail,
      mercadoPagoAccessToken,
      mercadoPagoPublicKey,
    } = body;

    // Validações iniciais
    if (!databaseUrl) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_URL é obrigatória' },
        { status: 400 }
      );
    }

    if (!adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Dados do administrador são obrigatórios' },
        { status: 400 }
      );
    }

    if (!companyName || !companyCnpj || !companyEmail) {
      return NextResponse.json(
        { success: false, error: 'Dados da empresa são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar formato da URL do banco
    const validDbPrefixes = ['postgresql://', 'postgres://', 'mysql://', 'sqlite:', 'file:'];
    const isValidDbUrl = validDbPrefixes.some(prefix => databaseUrl.startsWith(prefix));
    
    if (!isValidDbUrl) {
      return NextResponse.json(
        { success: false, error: 'URL do banco inválida. Deve começar com postgresql://, mysql:// ou sqlite:' },
        { status: 400 }
      );
    }

    // Validar senha
    if (adminPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validar CNPJ (formato básico)
    const cnpjNumbers = companyCnpj.replace(/\D/g, '');
    if (cnpjNumbers.length !== 14) {
      return NextResponse.json(
        { success: false, error: 'CNPJ deve ter 14 dígitos' },
        { status: 400 }
      );
    }

    // Gerar NEXTAUTH_SECRET se não fornecido
    const secret = nextauthSecret || crypto.randomBytes(32).toString('base64');

    // Passo 1: Salvar arquivo .env.local
    steps.push({ step: 'env', status: 'running', message: 'Salvando variáveis de ambiente...' });
    
    try {
      const envContent = `# Configuração gerada pelo Setup Wizard
# Data: ${new Date().toISOString()}

# Banco de Dados
DATABASE_URL="${databaseUrl}"

# NextAuth
NEXTAUTH_SECRET="${secret}"
NEXTAUTH_URL="${nextauthUrl || process.env.NEXTAUTH_URL || 'https://construtorpro3.vercel.app'}"

# MercadoPago (opcional)
${mercadoPagoAccessToken ? `MERCADOPAGO_ACCESS_TOKEN="${mercadoPagoAccessToken}"` : '# MERCADOPAGO_ACCESS_TOKEN=""'}
${mercadoPagoPublicKey ? `MERCADOPAGO_PUBLIC_KEY="${mercadoPagoPublicKey}"` : '# MERCADOPAGO_PUBLIC_KEY=""'}
`;
      const envPath = path.join(process.cwd(), '.env.local');
      fs.writeFileSync(envPath, envContent);
      
      steps[0].status = 'success';
      steps[0].message = 'Variáveis de ambiente salvas';
    } catch (error) {
      steps[0].status = 'error';
      steps[0].message = 'Erro ao salvar variáveis de ambiente';
      throw new Error('Falha ao salvar configurações');
    }

    // Passo 2: Executar migrações do banco
    steps.push({ step: 'migrate', status: 'running', message: 'Executando migrações do banco...' });
    
    try {
      // Executar prisma generate
      await execAsync('npx prisma generate', { 
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: databaseUrl }
      });
      
      // Executar prisma db push (para criar tabelas)
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss', { 
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: databaseUrl },
        timeout: 120000 // 2 minutos
      });
      
      console.log('Migration output:', stdout);
      if (stderr) console.log('Migration stderr:', stderr);
      
      steps[1].status = 'success';
      steps[1].message = 'Migrações executadas com sucesso';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro nas migrações:', errorMsg);
      steps[1].status = 'error';
      steps[1].message = `Erro nas migrações: ${errorMsg}`;
      // Continuar mesmo com erro, pois as tabelas podem já existir
    }

    // Passo 3: Criar empresa
    steps.push({ step: 'company', status: 'running', message: 'Criando empresa...' });
    
    let companyId: string;
    
    try {
      // Usar Prisma com a URL dinâmica
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });

      // Verificar se empresa já existe
      const existingCompany = await prisma.companies.findUnique({
        where: { cnpj: cnpjNumbers },
      });

      if (existingCompany) {
        companyId = existingCompany.id;
        steps[2].status = 'success';
        steps[2].message = 'Empresa já existe';
      } else {
        const company = await prisma.companies.create({
          data: {
            name: companyName,
            cnpj: cnpjNumbers,
            email: companyEmail,
            plan: 'trial',
            isActive: true,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dias
            subscriptionStatus: 'trial',
          },
        });
        companyId = company.id;
        steps[2].status = 'success';
        steps[2].message = 'Empresa criada com sucesso';
      }

      await prisma.$disconnect();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      steps[2].status = 'error';
      steps[2].message = `Erro ao criar empresa: ${errorMsg}`;
      throw new Error('Falha ao criar empresa');
    }

    // Passo 4: Criar usuário admin
    steps.push({ step: 'admin', status: 'running', message: 'Criando usuário administrador...' });
    
    try {
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });

      // Verificar se usuário já existe
      const existingUser = await prisma.users.findUnique({
        where: { email: adminEmail.toLowerCase() },
      });

      if (existingUser) {
        // Atualizar para admin se já existir
        await prisma.users.update({
          where: { id: existingUser.id },
          data: {
            role: 'company_admin',
            companyId: companyId,
            isActive: true,
          },
        });
        steps[3].status = 'success';
        steps[3].message = 'Usuário atualizado para admin';
      } else {
        // Criar hash da senha
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        await prisma.users.create({
          data: {
            email: adminEmail.toLowerCase(),
            name: adminName,
            password: hashedPassword,
            role: 'company_admin',
            companyId: companyId,
            isActive: true,
          },
        });
        steps[3].status = 'success';
        steps[3].message = 'Usuário administrador criado';
      }

      await prisma.$disconnect();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      steps[3].status = 'error';
      steps[3].message = `Erro ao criar usuário: ${errorMsg}`;
      throw new Error('Falha ao criar usuário admin');
    }

    // Passo 5: Salvar configuração local
    steps.push({ step: 'config', status: 'running', message: 'Salvando configuração...' });
    
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      const config = {
        configured: true,
        databaseType: databaseUrl.startsWith('postgresql') ? 'PostgreSQL' : 
                      databaseUrl.startsWith('mysql') ? 'MySQL' : 'SQLite',
        configuredAt: new Date().toISOString(),
        companyName,
        companyCnpj: cnpjNumbers,
        adminEmail: adminEmail.toLowerCase(),
        hasMercadoPago: !!(mercadoPagoAccessToken && mercadoPagoPublicKey),
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      steps[4].status = 'success';
      steps[4].message = 'Configuração salva';
    } catch (error) {
      steps[4].status = 'error';
      steps[4].message = 'Erro ao salvar configuração';
      // Não é crítico, continuar
    }

    // Preparar instruções para Vercel
    const vercelInstructions = {
      title: 'Variáveis de Ambiente para o Vercel',
      description: 'O Vercel não permite salvar variáveis via código. Configure manualmente:',
      variables: [
        { name: 'DATABASE_URL', value: databaseUrl, masked: true },
        { name: 'NEXTAUTH_SECRET', value: secret },
        { name: 'NEXTAUTH_URL', value: nextauthUrl || 'https://construtorpro3.vercel.app' },
      ],
      optional: [
        { name: 'MERCADOPAGO_ACCESS_TOKEN', value: mercadoPagoAccessToken || '' },
        { name: 'MERCADOPAGO_PUBLIC_KEY', value: mercadoPagoPublicKey || '' },
      ],
      steps: [
        '1. Acesse https://vercel.com/dashboard',
        '2. Selecione o projeto ConstrutorPro',
        '3. Vá em Settings > Environment Variables',
        '4. Adicione cada variável listada acima',
        '5. Clique em "Save"',
        '6. Faça um novo deploy do projeto',
      ],
    };

    return NextResponse.json({
      success: true,
      message: 'Setup concluído com sucesso!',
      steps,
      vercelInstructions,
      redirectUrl: '/login',
    });

  } catch (error) {
    console.error('Erro no setup:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno no setup',
        steps,
      },
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
    
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

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
