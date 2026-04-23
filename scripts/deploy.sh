#!/bin/bash

# =============================================================================
# ConstrutorPro - Script de Deploy Rápido
# =============================================================================
# Uso: ./scripts/deploy.sh [opção]
# Opções:
#   build     - Apenas construir a imagem
#   start     - Iniciar containers
#   stop      - Parar containers
#   logs      - Ver logs
#   migrate   - Executar migrações
#   seed      - Popular dados iniciais
#   reset     - Resetar banco (CUIDADO!)
#   full      - Deploy completo (build + start + migrate + seed)
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funções
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Verificar Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado."
        exit 1
    fi
    if ! command -v docker &> /dev/null; then
        log_error "Docker Compose não está instalado."
        exit 1
    fi
}

# Verificar .env
check_env() {
    if [ ! -f .env ]; then
        log_error "Arquivo .env não encontrado."
        log_info "Execute: cp .env.example .env"
        log_info "Ou execute: node scripts/setup-production.js"
        exit 1
    fi
}

# Build
build() {
    log_info "Construindo imagem Docker..."
    docker compose -f docker-compose.prod.yml build --no-cache
    log_success "Build concluído!"
}

# Start
start() {
    log_info "Iniciando containers..."
    docker compose -f docker-compose.prod.yml up -d
    log_success "Containers iniciados!"
    log_info "Aguarde alguns segundos para a aplicação inicializar..."
    sleep 5
    log_info "Aplicação disponível em: http://localhost:3000"
}

# Stop
stop() {
    log_info "Parando containers..."
    docker compose -f docker-compose.prod.yml down
    log_success "Containers parados!"
}

# Logs
logs() {
    docker compose -f docker-compose.prod.yml logs -f
}

# Migrate
migrate() {
    log_info "Executando migrações do banco de dados..."
    docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
    log_success "Migrações aplicadas!"
}

# Seed
seed() {
    log_info "Populando dados iniciais..."
    docker compose -f docker-compose.prod.yml exec app npx prisma db seed
    log_success "Dados iniciais inseridos!"
}

# Reset
reset() {
    log_warning "⚠️  ATENÇÃO: Isso irá APAGAR TODOS OS DADOS do banco!"
    read -p "Tem certeza? (digite 'CONFIRMAR'): " confirm
    if [ "$confirm" = "CONFIRMAR" ]; then
        log_info "Resetando banco de dados..."
        docker compose -f docker-compose.prod.yml exec app npx prisma migrate reset --force
        log_success "Banco resetado!"
    else
        log_info "Operação cancelada."
    fi
}

# Full deploy
full_deploy() {
    log_info "=== DEPLOY COMPLETO ==="
    check_env
    build
    start
    sleep 10
    migrate
    seed
    log_success "=== DEPLOY CONCLUÍDO COM SUCESSO! ==="
    log_info "Acesse: http://localhost:3000"
}

# Menu de ajuda
help() {
    echo -e "${CYAN}ConstrutorPro - Script de Deploy${NC}"
    echo ""
    echo "Uso: ./scripts/deploy.sh [opção]"
    echo ""
    echo "Opções:"
    echo "  build     - Construir imagem Docker"
    echo "  start     - Iniciar containers"
    echo "  stop      - Parar containers"
    echo "  logs      - Ver logs em tempo real"
    echo "  migrate   - Executar migrações do banco"
    echo "  seed      - Popular dados iniciais"
    echo "  reset     - Resetar banco (APAGA TUDO!)"
    echo "  full      - Deploy completo"
    echo ""
}

# Principal
case "${1:-help}" in
    build)
        check_docker
        build
        ;;
    start)
        check_docker
        check_env
        start
        ;;
    stop)
        check_docker
        stop
        ;;
    logs)
        check_docker
        logs
        ;;
    migrate)
        check_docker
        migrate
        ;;
    seed)
        check_docker
        seed
        ;;
    reset)
        check_docker
        reset
        ;;
    full)
        check_docker
        full_deploy
        ;;
    *)
        help
        ;;
esac
