#!/usr/bin/env node
// =============================================================================
// ConstrutorPro - Script de Configuração Inteligente do Banco de Dados
// =============================================================================
// Detecta automaticamente qual banco de dados usar (PostgreSQL ou SQLite)
// =============================================================================

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
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

function execCommand(command, silent = false) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
  } catch {
    return null;
  }
}

function checkDockerAvailable() {
  try {
    const result = execSync('which docker', { encoding: 'utf-8', stdio: 'pipe' });
    return result && result.trim() !== '';
  } catch {
    return false;
  }
}

function checkDockerPostgresRunning() {
  try {
    const result = execSync('docker ps --filter name=construtorpro-postgres --format "{{.Names}}"', { encoding: 'utf-8', stdio: 'pipe' });
    return result && result.includes('construtorpro-postgres');
  } catch {
    return false;
  }
}

function startDockerPostgres() {
  log('\n🚀 Iniciando PostgreSQL via Docker...', 'yellow');
  execCommand('docker-compose -f docker-compose.postgres.yml up -d');

  log('⏳ Aguardando PostgreSQL iniciar...', 'yellow');
  let retries = 30;
  while (retries > 0) {
    try {
      execSync('docker exec construtorpro-postgres pg_isready -U postgres', { encoding: 'utf-8', stdio: 'pipe' });
      log('✓ PostgreSQL está pronto!', 'green');
      return true;
    } catch {
      retries--;
      process.stdout.write('.');
    }
  }
  log('\n✗ Timeout aguardando PostgreSQL', 'red');
  return false;
}

function updateEnvFile(dbUrl, provider) {
  const envPath = path.join(__dirname, '..', '.env');
  let content = '';

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  if (content.includes('DATABASE_URL=')) {
    content = content.replace(/DATABASE_URL="[^"]*"/, `DATABASE_URL="${dbUrl}"`);
  } else {
    content += `\nDATABASE_URL="${dbUrl}"\n`;
  }

  fs.writeFileSync(envPath, content);
  log(`✓ Arquivo .env atualizado com ${provider}`, 'green');
}

function updatePrismaSchema(provider) {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

  if (provider === 'sqlite') {
    const sqliteSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.sqlite.prisma');
    if (fs.existsSync(sqliteSchemaPath)) {
      fs.copyFileSync(sqliteSchemaPath, schemaPath);
      log('✓ Schema Prisma atualizado para SQLite', 'green');
    } else {
      let content = fs.readFileSync(schemaPath, 'utf-8');
      content = content.replace(/provider = "postgresql"/, 'provider = "sqlite"');
      fs.writeFileSync(schemaPath, content);
      log('✓ Schema Prisma atualizado para SQLite', 'green');
    }
  } else {
    let content = fs.readFileSync(schemaPath, 'utf-8');
    content = content.replace(/provider = "sqlite"/, 'provider = "postgresql"');
    fs.writeFileSync(schemaPath, content);
    log('✓ Schema Prisma atualizado para PostgreSQL', 'green');
  }
}

async function runMigrations() {
  log('\n🔧 Configurando Prisma...', 'yellow');

  log('   Gerando cliente Prisma...', 'blue');
  execCommand('npx prisma generate');

  log('   Executando migrations...', 'blue');
  const migrateResult = execCommand('npx prisma migrate dev --name init', true);

  if (migrateResult === null) {
    log('   Tentando push...', 'blue');
    execCommand('npx prisma db push');
  }

  log('   Populando banco de dados...', 'blue');
  execCommand('npx prisma db seed');

  log('\n✓ Configuração concluída!', 'green');
  log('   Execute npm run dev para iniciar o servidor.', 'blue');
}

async function setupDatabase() {
  log('\n==================================================', 'cyan');
  log('  ConstrutorPro - Configuração do Banco de Dados', 'cyan');
  log('==================================================\n', 'cyan');

  const postgresUrl = 'postgresql://postgres:postgres@localhost:5432/construtorpro';
  const sqliteUrl = 'file:./db/construtorpro.db';

  const dockerAvailable = checkDockerAvailable();
  log(`🐳 Docker disponível: ${dockerAvailable ? '✓' : '✗'}`, dockerAvailable ? 'green' : 'red');

  if (dockerAvailable) {
    const dockerPostgresRunning = checkDockerPostgresRunning();
    log(`🐳 Docker PostgreSQL rodando: ${dockerPostgresRunning ? '✓' : '✗'}`, dockerPostgresRunning ? 'green' : 'yellow');

    if (!dockerPostgresRunning) {
      log('\n📋 Deseja iniciar PostgreSQL via Docker? (s/n)', 'yellow');
      log('   Isso criará um container PostgreSQL local.', 'blue');

      try {
        const dockerComposeAvailable = execSync('which docker-compose', { encoding: 'utf-8' }).trim() !== '' ||
                                        execSync('docker compose version', { encoding: 'utf-8', stdio: 'pipe' }) !== null;

        if (dockerComposeAvailable) {
          log('\n🚀 Iniciando PostgreSQL via Docker...', 'yellow');
          if (startDockerPostgres()) {
            updateEnvFile(postgresUrl, 'PostgreSQL');
            updatePrismaSchema('postgresql');
            await runMigrations();
            return;
          }
        }
      } catch {
        // Continue to fallback
      }
    } else {
      updateEnvFile(postgresUrl, 'PostgreSQL');
      updatePrismaSchema('postgresql');
      await runMigrations();
      return;
    }
  }

  log('\n🔍 Verificando PostgreSQL local...', 'yellow');
  let psqlAvailable = false;
  try {
    const result = execSync('which psql', { encoding: 'utf-8', stdio: 'pipe' });
    psqlAvailable = result && result.trim() !== '';
  } catch {
    psqlAvailable = false;
  }

  if (psqlAvailable) {
    log('✓ PostgreSQL cliente encontrado', 'green');

    let pgRunning = false;
    try {
      const result = execSync('pg_isready -h localhost -p 5432', { encoding: 'utf-8', stdio: 'pipe' });
      pgRunning = result && result.includes('accepting connections');
    } catch {
      pgRunning = false;
    }

    if (pgRunning) {
      log('✓ Servidor PostgreSQL está rodando', 'green');
      updateEnvFile(postgresUrl, 'PostgreSQL');
      updatePrismaSchema('postgresql');
      await runMigrations();
      return;
    }
  }

  log('\n⚠️  PostgreSQL não disponível. Usando SQLite como fallback.', 'yellow');
  log('   Para usar PostgreSQL, instale-o ou use um serviço na nuvem.', 'blue');

  updateEnvFile(sqliteUrl, 'SQLite');
  updatePrismaSchema('sqlite');

  log('\n📊 Serviços PostgreSQL gratuitos recomendados:', 'cyan');
  log('   • Neon: https://neon.tech (0.5GB gratuito)', 'blue');
  log('   • Supabase: https://supabase.com (500MB gratuito)', 'blue');
  log('   • Railway: https://railway.app (1GB gratuito)', 'blue');

  await runMigrations();
}

setupDatabase().catch(error => {
  log(`\n✗ Erro: ${error.message}`, 'red');
  process.exit(1);
});
