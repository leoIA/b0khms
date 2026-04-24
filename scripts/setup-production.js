#!/usr/bin/env node

/**
 * ConstrutorPro - Script de Configuração
 * 
 * Este script ajuda a configurar o sistema para deploy
 * Execute: node scripts/setup-production.js
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

async function main() {
  console.log('\n');
  log('cyan', '═══════════════════════════════════════════════════════════════');
  log('cyan', '       ConstrutorPro - Configuração de Produção');
  log('cyan', '═══════════════════════════════════════════════════════════════\n');

  log('blue', 'Este script vai ajudá-lo a configurar o sistema para deploy.\n');

  // Verificar se .env já existe
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (fs.existsSync(envPath)) {
    log('yellow', '⚠️  Arquivo .env já existe.');
    const overwrite = await question('Deseja reconfigurar? (s/N): ');
    if (overwrite.toLowerCase() !== 's') {
      log('green', '✓ Mantendo configuração atual.');
      rl.close();
      return;
    }
  }

  // Verificar se .env.example existe
  if (!fs.existsSync(envExamplePath)) {
    log('red', '❌ Arquivo .env.example não encontrado.');
    rl.close();
    return;
  }

  log('blue', '\n📝 Configuração do Banco de Dados\n');
  log('reset', 'Opções populares:');
  log('reset', '  1. Vercel Postgres (recomendado para Vercel)');
  log('reset', '  2. Neon (https://neon.tech) - Gratuito');
  log('reset', '  3. Supabase (https://supabase.com) - Gratuito');
  log('reset', '  4. Railway (https://railway.app)');
  log('reset', '  5. PostgreSQL próprio\n');

  const databaseUrl = await question('📄 DATABASE_URL (string de conexão PostgreSQL): ');

  log('blue', '\n📝 Configuração da Aplicação\n');
  
  const appUrl = await question('🌐 URL da aplicação (ex: https://construtorpro.com.br): ') || 'http://localhost:3000';
  
  log('blue', '\n📝 Configuração de Autenticação\n');
  log('reset', 'Gerando NEXTAUTH_SECRET automaticamente...');
  const nextauthSecret = generateSecret(32);
  log('green', `✓ Secret gerado: ${nextauthSecret}`);

  log('blue', '\n📝 Configuração do MercadoPago\n');
  log('reset', 'Obtenha suas credenciais em: https://www.mercadopago.com.br/developers/panel\n');
  
  const mpAccessToken = await question('🔑 MERCADOPAGO_ACCESS_TOKEN: ');
  const mpPublicKey = await question('🔑 NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: ');
  const mpWebhookSecret = await question('🔑 MERCADOPAGO_WEBHOOK_SECRET (ou Enter para gerar): ') || generateSecret(16);
  
  const mpSandbox = await question('🧪 Modo Sandbox? (s/N): ');
  const isSandbox = mpSandbox.toLowerCase() === 's' ? 'true' : 'false';

  log('blue', '\n📝 Configuração de Email (Opcional)\n');
  const configureEmail = await question('Configurar SMTP para emails? (s/N): ');
  
  let smtpConfig = '';
  if (configureEmail.toLowerCase() === 's') {
    const smtpHost = await question('  SMTP Host (ex: smtp.gmail.com): ');
    const smtpPort = await question('  SMTP Port (ex: 587): ') || '587';
    const smtpUser = await question('  SMTP User (email): ');
    const smtpPass = await question('  SMTP Password: ');
    const smtpFrom = await question('  Email remetente: ');
    
    smtpConfig = `
# -----------------------------------------------------------------------------
# EMAIL
# -----------------------------------------------------------------------------
SMTP_HOST="${smtpHost}"
SMTP_PORT="${smtpPort}"
SMTP_USER="${smtpUser}"
SMTP_PASS="${smtpPass}"
SMTP_FROM="${smtpFrom}"`;
  }

  // Criar arquivo .env
  const envContent = `# =============================================================================
# ConstrutorPro - Configuração de Produção
# Gerado automaticamente em: ${new Date().toISOString()}
# =============================================================================

# -----------------------------------------------------------------------------
# BANCO DE DADOS
# -----------------------------------------------------------------------------
DATABASE_URL="${databaseUrl}"

# -----------------------------------------------------------------------------
# APLICAÇÃO
# -----------------------------------------------------------------------------
NEXT_PUBLIC_APP_URL="${appUrl}"
NEXT_PUBLIC_APP_NAME="ConstrutorPro"

# -----------------------------------------------------------------------------
# AUTENTICAÇÃO
# -----------------------------------------------------------------------------
NEXTAUTH_SECRET="${nextauthSecret}"
NEXTAUTH_URL="${appUrl}"

# -----------------------------------------------------------------------------
# MERCADO PAGO
# -----------------------------------------------------------------------------
MERCADOPAGO_ACCESS_TOKEN="${mpAccessToken}"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="${mpPublicKey}"
MERCADOPAGO_WEBHOOK_SECRET="${mpWebhookSecret}"
MERCADOPAGO_SANDBOX="${isSandbox}"
${smtpConfig}

# -----------------------------------------------------------------------------
# INTEGRAÇÃO IA (OPCIONAL)
# -----------------------------------------------------------------------------
AI_API_KEY=""

# -----------------------------------------------------------------------------
# MONITORAMENTO (OPCIONAL)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SENTRY_DSN=""

# -----------------------------------------------------------------------------
# ANALYTICS (OPCIONAL)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_GA_ID=""
`;

  // Salvar arquivo
  fs.writeFileSync(envPath, envContent);
  log('green', '\n✓ Arquivo .env criado com sucesso!');

  // Próximos passos
  log('blue', '\n═══════════════════════════════════════════════════════════════');
  log('blue', '📋 Próximos Passos:');
  log('blue', '═══════════════════════════════════════════════════════════════\n');
  
  log('reset', '1. Testar conexão com banco:');
  log('cyan', '   npx prisma db pull\n');
  
  log('reset', '2. Aplicar migrações:');
  log('cyan', '   npx prisma migrate deploy\n');
  
  log('reset', '3. Popular dados iniciais:');
  log('cyan', '   npx prisma db seed\n');
  
  log('reset', '4. Testar build:');
  log('cyan', '   npm run build\n');
  
  log('reset', '5. Iniciar aplicação:');
  log('cyan', '   npm run start\n');

  log('yellow', '\n⚠️  IMPORTANTE:');
  log('reset', '   - Nunca commite o arquivo .env no git');
  log('reset', '   - Configure as mesmas variáveis no painel da sua hospedagem');
  log('reset', '   - Configure o webhook no MercadoPago:');
  log('cyan', `     ${appUrl}/api/webhooks/mercadopago\n`);

  log('green', '✓ Configuração concluída!\n');

  rl.close();
}

main().catch(console.error);
