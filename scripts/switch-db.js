#!/usr/bin/env node
// =============================================================================
// ConstrutorPro - Alternar entre PostgreSQL e SQLite
// =============================================================================
// Permite alternar facilmente entre os bancos de dados
// =============================================================================

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function updateEnvFile(dbUrl) {
  const envPath = path.join(__dirname, '..', '.env');
  let content = fs.readFileSync(envPath, 'utf-8');
  content = content.replace(/DATABASE_URL="[^"]*"/, `DATABASE_URL="${dbUrl}"`);
  fs.writeFileSync(envPath, content);
}

function updatePrismaSchema(provider) {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  let content = fs.readFileSync(schemaPath, 'utf-8');
  content = content.replace(/provider = "sqlite"/, `provider = "${provider}"`);
  content = content.replace(/provider = "postgresql"/, `provider = "${provider}"`);
  fs.writeFileSync(schemaPath, content);
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  log('\n==================================================', 'cyan');
  log('  ConstrutorPro - Alternar Banco de Dados', 'cyan');
  log('==================================================\n', 'cyan');

  log('Escolha o banco de dados:\n', 'yellow');
  log('  1) PostgreSQL (Produção)', 'blue');
  log('  2) SQLite (Desenvolvimento)', 'blue');
  log('  3) Configurar PostgreSQL na nuvem (Neon/Supabase)', 'blue');
  log('  4) Sair\n', 'blue');

  const option = await prompt('Opção: ');

  switch (option) {
    case '1': {
      log('\n🔧 Configurando PostgreSQL...', 'yellow');
      const dbUrl = await prompt('Digite a URL do PostgreSQL (ou pressione Enter para localhost): ');

      const finalUrl = dbUrl || 'postgresql://postgres:postgres@localhost:5432/construtorpro';

      updateEnvFile(finalUrl);
      updatePrismaSchema('postgresql');

      log('\n✓ Configurado para PostgreSQL!', 'green');
      log('  DATABASE_URL: ' + finalUrl, 'blue');
      log('\n  Execute: npx prisma migrate dev && npx prisma db seed', 'yellow');
      break;
    }

    case '2': {
      log('\n🔧 Configurando SQLite...', 'yellow');
      const dbUrl = 'file:./db/construtorpro.db';

      updateEnvFile(dbUrl);
      updatePrismaSchema('sqlite');

      log('\n✓ Configurado para SQLite!', 'green');
      log('  DATABASE_URL: ' + dbUrl, 'blue');
      log('\n  Execute: npx prisma db push && npx prisma db seed', 'yellow');
      break;
    }

    case '3': {
      log('\n📊 Serviços PostgreSQL gratuitos:\n', 'cyan');
      log('  Neon: https://neon.tech', 'blue');
      log('    - 0.5GB gratuito');
      log('    - Sem necessidade de cartão de crédito');
      log('');
      log('  Supabase: https://supabase.com', 'blue');
      log('    - 500MB gratuito');
      log('    - Inclui autenticação e storage');
      log('');
      log('  Railway: https://railway.app', 'blue');
      log('    - 1GB gratuito');
      log('    - Deploy fácil');
      log('\n');

      log('Passos:\n', 'yellow');
      log('  1. Crie uma conta em um dos serviços acima');
      log('  2. Crie um novo projeto PostgreSQL');
      log('  3. Copie a connection string');
      log('  4. Execute este script novamente e escolha a opção 1');
      log('');
      break;
    }

    case '4': {
      log('\n👋 Até logo!', 'green');
      break;
    }

    default: {
      log('\n✗ Opção inválida', 'red');
      break;
    }
  }
}

main().catch(console.error);
