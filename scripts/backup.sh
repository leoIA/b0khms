#!/bin/bash
# =============================================================================
# ConstrutorPro - Backup Script
# Backup automático do PostgreSQL com criptografia e upload para S3
# =============================================================================

set -e

# Configurações
BACKUP_DIR="${BACKUP_DIR:-/var/backups/construtorpro}"
DATABASE_URL="${DATABASE_URL:-}"
S3_BUCKET="${S3_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="construtorpro_${TIMESTAMP}.sql.gz.enc"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar dependências
check_dependencies() {
  log_info "Verificando dependências..."
  
  local missing=0
  
  if ! command -v pg_dump &> /dev/null; then
    log_error "pg_dump não encontrado. Instale o PostgreSQL client."
    missing=1
  fi
  
  if ! command -v openssl &> /dev/null; then
    log_error "openssl não encontrado."
    missing=1
  fi
  
  if [ -n "$S3_BUCKET" ] && ! command -v aws &> /dev/null; then
    log_warn "AWS CLI não encontrado. Upload S3 será ignorado."
  fi
  
  if [ $missing -eq 1 ]; then
    exit 1
  fi
}

# Parse DATABASE_URL
parse_database_url() {
  # Formato: postgresql://user:password@host:port/database
  if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL não definida"
    exit 1
  fi
  
  # Extrair componentes
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's/postgresql:\/\/\([^:]*\):.*/\1/p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/postgresql:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  
  export PGPASSWORD="$DB_PASS"
}

# Criar diretório de backup
create_backup_dir() {
  if [ ! -d "$BACKUP_DIR" ]; then
    log_info "Criando diretório de backup: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
  fi
}

# Executar backup do PostgreSQL
run_backup() {
  log_info "Iniciando backup do banco de dados..."
  log_info "Host: $DB_HOST, Database: $DB_NAME"
  
  local start_time=$(date +%s)
  
  # Executar pg_dump e comprimir
  pg_dump \
    -h "$DB_HOST" \
    -p "${DB_PORT:-5432}" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > "${BACKUP_PATH%.enc}"
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  log_info "Backup concluído em ${duration}s"
}

# Criptografar backup
encrypt_backup() {
  if [ -z "$ENCRYPTION_KEY" ]; then
    log_warn "ENCRYPTION_KEY não definida. Backup não será criptografado."
    mv "${BACKUP_PATH%.enc}" "$BACKUP_PATH"
    return
  fi
  
  log_info "Criptografando backup..."
  
  # Criptografar com AES-256-CBC
  openssl enc \
    -aes-256-cbc \
    -salt \
    -pbkdf2 \
    -iter 100000 \
    -in "${BACKUP_PATH%.enc}" \
    -out "$BACKUP_PATH" \
    -pass pass:"$ENCRYPTION_KEY"
  
  # Remover arquivo não criptografado
  rm -f "${BACKUP_PATH%.enc}"
  
  log_info "Backup criptografado: $BACKUP_PATH"
}

# Calcular checksum
calculate_checksum() {
  log_info "Calculando checksum..."
  
  local checksum=$(sha256sum "$BACKUP_PATH" | awk '{print $1}')
  echo "$checksum" > "${BACKUP_PATH}.sha256"
  
  log_info "SHA-256: $checksum"
}

# Upload para S3
upload_to_s3() {
  if [ -z "$S3_BUCKET" ]; then
    log_info "Upload S3 não configurado. Pulando..."
    return
  fi
  
  if ! command -v aws &> /dev/null; then
    log_warn "AWS CLI não encontrado. Pulando upload S3."
    return
  fi
  
  log_info "Enviando backup para S3..."
  
  # Configurar credenciais AWS
  export AWS_ACCESS_KEY_ID
  export AWS_SECRET_ACCESS_KEY
  
  # Upload
  aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/backups/${BACKUP_FILE}" \
    --region "$S3_REGION" \
    --storage-class STANDARD_IA
  
  # Upload checksum
  aws s3 cp "${BACKUP_PATH}.sha256" "s3://${S3_BUCKET}/backups/${BACKUP_FILE}.sha256" \
    --region "$S3_REGION"
  
  log_info "Backup enviado para s3://${S3_BUCKET}/backups/${BACKUP_FILE}"
}

# Limpar backups antigos
cleanup_old_backups() {
  log_info "Limpando backups antigos (retenção: ${RETENTION_DAYS} dias)..."
  
  # Encontrar e remover backups locais antigos
  find "$BACKUP_DIR" \
    -name "construtorpro_*.sql.gz.enc" \
    -type f \
    -mtime +$RETENTION_DAYS \
    -delete
  
  # Encontrar e remover checksums antigos
  find "$BACKUP_DIR" \
    -name "construtorpro_*.sql.gz.enc.sha256" \
    -type f \
    -mtime +$RETENTION_DAYS \
    -delete
  
  log_info "Limpeza concluída"
}

# Limpar backups antigos do S3
cleanup_s3_backups() {
  if [ -z "$S3_BUCKET" ]; then
    return
  fi
  
  log_info "Limpando backups antigos do S3..."
  
  local cutoff_date=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d)
  
  # Listar e remover backups antigos do S3
  aws s3 ls "s3://${S3_BUCKET}/backups/" \
    --region "$S3_REGION" \
    | awk '{print $4}' \
    | while read -r file; do
      if [ -n "$file" ]; then
        local file_date=$(echo "$file" | sed 's/construtorpro_\([0-9]*\)_.*/\1/' | cut -c1-8)
        if [ "$file_date" \< "$cutoff_date" ]; then
          aws s3 rm "s3://${S3_BUCKET}/backups/$file" --region "$S3_REGION"
          log_info "Removido do S3: $file"
        fi
      fi
    done
}

# Registrar backup no banco
log_backup_to_db() {
  local file_size=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH" 2>/dev/null || echo "0")
  local checksum=$(cat "${BACKUP_PATH}.sha256" 2>/dev/null || echo "")
  
  log_info "Tamanho: ${file_size} bytes"
  log_info "Checksum: ${checksum:-N/A}"
}

# Função principal
main() {
  log_info "=========================================="
  log_info "ConstrutorPro - Backup Script"
  log_info "Data: $(date '+%Y-%m-%d %H:%M:%S')"
  log_info "=========================================="
  
  check_dependencies
  parse_database_url
  create_backup_dir
  run_backup
  encrypt_backup
  calculate_checksum
  upload_to_s3
  cleanup_old_backups
  cleanup_s3_backups
  
  log_info "=========================================="
  log_info "Backup concluído com sucesso!"
  log_info "Arquivo: $BACKUP_PATH"
  log_info "=========================================="
}

# Executar
main "$@"
