// =============================================================================
// ConstrutorPro - Script de Verificação do Banco de Dados
// =============================================================================
// Verifica se o PostgreSQL está disponível e configura automaticamente
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
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPostgresInstalled() {
  try {
    const result = execSync('which psql', { encoding: 'utf-8' });
    return result.trim() !== '';
  } catch {
    return false;
  }
}

function checkPostgresRunning() {
  try {
    execSync('pg_isready -h localhost -p 5432', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

function checkDockerAvailable() {
  try {
    const result = execSync('which docker', { encoding: 'utf-8' });
    return result.trim() !== '';
  } catch {
    return false;
  }
}

function checkDockerComposeRunning() {
  try {
    const result = execSync('docker ps --filter name=construtorpro-postgres --format "{{.Names}}"', { encoding: 'utf-8' });
    return result.includes('construtorpro-postgres');
  } catch {
    return false;
  }
}

function getEnvDatabaseUrl() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/DATABASE_URL="([^"]+)"/);
    return match ? match[1] : null;
  }
  return null;
}

async function main() {
  log('\n==================================================', 'blue');
  log('  ConstrutorPro - Verificação do Banco de Dados', 'blue');
  log('==================================================\n', 'blue');

  const dbUrl = getEnvDatabaseUrl();
  log(`DATABASE_URL configurada: ${dbUrl ? '✓' : '✗'}`, dbUrl ? 'green' : 'red');

  // Verificar PostgreSQL instalado
  log('\n🔍 Verificando PostgreSQL...', 'yellow');
  const postgresInstalled = checkPostgresInstalled();
  log(`   PostgreSQL instalado: ${postgresInstalled ? '✓' : '✗'}`, postgresInstalled ? 'green' : 'red');

  if (postgresInstalled) {
    const postgresRunning = checkPostgresRunning();
    log(`   Servidor rodando: ${postgresRunning ? '✓' : '✗'}`, postgresRunning ? 'green' : 'red');
  }

  // Verificar Docker
  log('\n🔍 Verificando Docker...', 'yellow');
  const dockerAvailable = checkDockerAvailable();
  log(`   Docker disponível: ${dockerAvailable ? '✓' : '✗'}`, dockerAvailable ? 'green' : 'red');

  if (dockerAvailable) {
    const dockerComposeRunning = checkDockerComposeRunning();
    log(`   Container PostgreSQL rodando: ${dockerComposeRunning ? '✓' : '✗'}`, dockerComposeRunning ? 'green' : 'red');
  }

  // Recomendar ação
  log('\n📋 Recomendação:', 'yellow');

  if (dockerAvailable && !checkDockerComposeRunning()) {
    log('   Execute: docker-compose -f docker-compose.postgres.yml up -d', 'blue');
    log('   Depois: npx prisma migrate dev && npx prisma db seed', 'blue');
  } else if (postgresInstalled && !checkPostgresRunning()) {
    log('   Inicie o PostgreSQL: sudo systemctl start postgresql', 'blue');
    log('   Depois: npx prisma migrate dev && npx prisma db seed', 'blue');
  } else if (!postgresInstalled && !dockerAvailable) {
    log('   Opções disponíveis:', 'blue');
    log('   1. Instale PostgreSQL: sudo apt install postgresql', 'blue');
    log('   2. Use Docker: instale Docker e execute docker-compose', 'blue');
    log('   3. Use serviço na nuvem (Neon, Supabase, Railway)', 'blue');
    log('\n   Serviços gratuitos recomendados:', 'yellow');
    log('   - Neon: https://neon.tech (0.5GB gratuito)', 'blue');
    log('   - Supabase: https://supabase.com (500MB gratuito)', 'blue');
    log('   - Railway: https://railway.app (1GB gratuito)', 'blue');
  } else {
    log('   PostgreSQL está pronto! Execute:', 'green');
    log('   npx prisma migrate dev && npx prisma db seed', 'blue');
  }

  log('\n==================================================\n', 'blue');
}

main().catch(console.error);
