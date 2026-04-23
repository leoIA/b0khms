#!/bin/bash
# =============================================================================
# ConstrutorPro - Backup Restore Test Script
# Testa a restauração do backup para garantir integridade
# =============================================================================

set -e

# Configurações
BACKUP_DIR="${BACKUP_DIR:-/var/backups/construtorpro}"
TEST_DATABASE="construtorpro_test_restore"
DATABASE_URL="${DATABASE_URL:-}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"
LOG_FILE="/var/log/construtorpro/restore_test.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${BLUE}[$timestamp]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  log "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  log "${RED}[ERROR]${NC} $1"
}

log_warn() {
  log "${YELLOW}[WARN]${NC} $1"
}

# Criar diretório de log
create_log_dir() {
  local log_dir=$(dirname "$LOG_FILE")
  if [ ! -d "$log_dir" ]; then
    mkdir -p "$log_dir"
  fi
}

# Encontrar o backup mais recente
find_latest_backup() {
  local latest=$(ls -t "${BACKUP_DIR}"/construtorpro_*.sql.gz.enc 2>/dev/null | head -1)
  
  if [ -z "$latest" ]; then
    log_error "Nenhum backup encontrado em $BACKUP_DIR"
    exit 1
  fi
  
  echo "$latest"
}

# Verificar integridade do backup
verify_backup_integrity() {
  local backup_file="$1"
  local checksum_file="${backup_file}.sha256"
  
  log "Verificando integridade do backup..."
  
  if [ ! -f "$checksum_file" ]; then
    log_warn "Arquivo de checksum não encontrado: $checksum_file"
    return 0
  fi
  
  local expected_checksum=$(cut -d' ' -f1 < "$checksum_file")
  local actual_checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
  
  if [ "$expected_checksum" = "$actual_checksum" ]; then
    log_success "Checksum válido: $actual_checksum"
    return 0
  else
    log_error "Checksum inválido!"
    log_error "Esperado: $expected_checksum"
    log_error "Atual: $actual_checksum"
    return 1
  fi
}

# Descriptografar backup
decrypt_backup() {
  local backup_file="$1"
  local output_file="${backup_file%.enc}"
  
  log "Descriptografando backup..."
  
  if [ -z "$ENCRYPTION_KEY" ]; then
    log_warn "ENCRYPTION_KEY não definida. Assumindo backup não criptografado."
    cp "$backup_file" "$output_file"
    gunzip "$output_file"
    echo "${output_file%.gz}"
    return
  fi
  
  # Descriptografar
  openssl enc \
    -aes-256-cbc \
    -d \
    -pbkdf2 \
    -iter 100000 \
    -in "$backup_file" \
    -out "${output_file%.gz}" \
    -pass pass:"$ENCRYPTION_KEY" 2>/dev/null
  
  # Descomprimir se necessário
  if file "${output_file%.gz}" | grep -q "gzip"; then
    gunzip "${output_file%.gz}"
  fi
  
  log_success "Backup descriptografado: ${output_file%.gz}"
  echo "${output_file%.gz}"
}

# Parse DATABASE_URL
parse_database_url() {
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's/postgresql:\/\/\([^:]*\):.*/\1/p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/postgresql:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
  
  export PGPASSWORD="$DB_PASS"
}

# Criar banco de teste
create_test_database() {
  log "Criando banco de teste: $TEST_DATABASE"
  
  # Drop se existir
  psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS $TEST_DATABASE;" 2>/dev/null
  
  # Criar banco
  psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d postgres \
    -c "CREATE DATABASE $TEST_DATABASE;"
  
  log_success "Banco de teste criado"
}

# Restaurar backup
restore_backup() {
  local sql_file="$1"
  local start_time=$(date +%s)
  
  log "Iniciando restauração..."
  
  psql \
    -h "$DB_HOST" \
    -p "${DB_PORT:-5432}" \
    -U "$DB_USER" \
    -d "$TEST_DATABASE" \
    -f "$sql_file" > /dev/null 2>&1
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  log_success "Restauração concluída em ${duration}s"
}

# Verificar integridade dos dados
verify_data_integrity() {
  log "Verificando integridade dos dados..."
  
  local tables_count=$(psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$TEST_DATABASE" -t -c "
    SELECT count(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  " | tr -d ' ')
  
  log "Tabelas encontradas: $tables_count"
  
  if [ "$tables_count" -lt 10 ]; then
    log_warn "Número baixo de tabelas. Backup pode estar incompleto."
  fi
  
  # Verificar algumas tabelas críticas
  local critical_tables=("companies" "users" "projects" "budgets")
  local missing_tables=0
  
  for table in "${critical_tables[@]}"; do
    local exists=$(psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$TEST_DATABASE" -t -c "
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '$table'
      );
    " | tr -d ' ')
    
    if [ "$exists" = "f" ]; then
      log_error "Tabela crítica não encontrada: $table"
      missing_tables=$((missing_tables + 1))
    fi
  done
  
  if [ $missing_tables -gt 0 ]; then
    return 1
  fi
  
  log_success "Todas as tabelas críticas presentes"
}

# Verificar índices
verify_indexes() {
  log "Verificando índices..."
  
  local invalid_indexes=$(psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$TEST_DATABASE" -t -c "
    SELECT count(*) 
    FROM pg_index 
    WHERE NOT indisvalid;
  " | tr -d ' ')
  
  if [ "$invalid_indexes" -gt 0 ]; then
    log_warn "Encontrados $invalid_indexes índices inválidos"
    return 1
  fi
  
  log_success "Todos os índices válidos"
}

# Verificar constraints
verify_constraints() {
  log "Verificando constraints..."
  
  local violations=$(psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$TEST_DATABASE" -t -c "
    SELECT count(*) 
    FROM pg_constraint 
    WHERE convalidated = false;
  " | tr -d ' ')
  
  if [ "$violations" -gt 0 ]; then
    log_warn "Encontradas $violations constraints não validadas"
    return 1
  fi
  
  log_success "Todas as constraints validadas"
}

# Limpar banco de teste
cleanup_test_database() {
  log "Limpando banco de teste..."
  
  psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS $TEST_DATABASE;" 2>/dev/null
  
  log_success "Banco de teste removido"
}

# Gerar relatório
generate_report() {
  local backup_file="$1"
  local start_time="$2"
  local end_time="$3"
  local duration=$((end_time - start_time))
  local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
  local file_size_mb=$((file_size / 1024 / 1024))
  
  log "=========================================="
  log "RELATÓRIO DE TESTE DE RESTAURAÇÃO"
  log "=========================================="
  log "Backup testado: $(basename $backup_file)"
  log "Tamanho: ${file_size_mb} MB"
  log "Duração: ${duration}s"
  log "Status: SUCESSO"
  log "=========================================="
}

# Função principal
main() {
  local start_time=$(date +%s)
  local temp_sql_file=""
  
  create_log_dir
  
  log "=========================================="
  log "ConstrutorPro - Teste de Restauração"
  log "Data: $(date '+%Y-%m-%d %H:%M:%S')"
  log "=========================================="
  
  # Encontrar backup mais recente
  local backup_file=$(find_latest_backup)
  log "Backup selecionado: $(basename $backup_file)"
  
  # Verificar integridade
  verify_backup_integrity "$backup_file" || exit 1
  
  # Descriptografar
  temp_sql_file=$(decrypt_backup "$backup_file")
  
  # Parse DATABASE_URL
  parse_database_url
  
  # Criar banco de teste
  create_test_database
  
  # Restaurar
  restore_backup "$temp_sql_file"
  
  # Verificações
  verify_data_integrity
  verify_indexes
  verify_constraints
  
  # Limpar
  cleanup_test_database
  rm -f "$temp_sql_file"
  
  local end_time=$(date +%s)
  
  # Relatório
  generate_report "$backup_file" "$start_time" "$end_time"
  
  log_success "Teste de restauração concluído com sucesso!"
}

# Executar
main "$@"
