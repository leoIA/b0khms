#!/bin/bash
# =============================================================================
# ConstrutorPro - Script de Configuração do PostgreSQL
# =============================================================================
# Este script configura o PostgreSQL para o ConstrutorPro
# =============================================================================

set -e

echo "=================================================="
echo "  ConstrutorPro - Configuração do PostgreSQL"
echo "=================================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se PostgreSQL está instalado
check_postgres() {
    echo -e "${YELLOW}Verificando instalação do PostgreSQL...${NC}"

    if command -v psql &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL cliente encontrado${NC}"
        psql --version
        return 0
    else
        echo -e "${RED}✗ PostgreSQL não encontrado${NC}"
        return 1
    fi
}

# Verificar se o servidor PostgreSQL está rodando
check_postgres_server() {
    echo -e "${YELLOW}Verificando servidor PostgreSQL...${NC}"

    if pg_isready -h localhost -p 5432 &> /dev/null; then
        echo -e "${GREEN}✓ Servidor PostgreSQL está rodando${NC}"
        return 0
    else
        echo -e "${RED}✗ Servidor PostgreSQL não está rodando${NC}"
        return 1
    fi
}

# Criar banco de dados
create_database() {
    echo -e "${YELLOW}Criando banco de dados 'construtorpro'...${NC}"

    # Verificar se o banco já existe
    if psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw construtorpro; then
        echo -e "${GREEN}✓ Banco de dados já existe${NC}"
    else
        createdb -U postgres construtorpro 2>/dev/null || true
        echo -e "${GREEN}✓ Banco de dados criado${NC}"
    fi
}

# Executar migrations
run_migrations() {
    echo -e "${YELLOW}Executando migrations do Prisma...${NC}"

    cd /home/z/my-project

    # Gerar cliente Prisma
    npx prisma generate

    # Executar migrations
    npx prisma migrate dev --name init

    echo -e "${GREEN}✓ Migrations executadas${NC}"
}

# Executar seed
run_seed() {
    echo -e "${YELLOW}Populando banco de dados...${NC}"

    cd /home/z/my-project
    npx prisma db seed

    echo -e "${GREEN}✓ Dados de exemplo inseridos${NC}"
}

# Menu principal
main() {
    echo "Escolha uma opção:"
    echo ""
    echo "1) Instalar PostgreSQL (requer sudo)"
    echo "2) Usar Docker Compose"
    echo "3) Configurar banco existente"
    echo "4) Usar serviço na nuvem (Neon/Supabise)"
    echo "5) Sair"
    echo ""
    read -p "Opção: " option

    case $option in
        1)
            echo -e "${YELLOW}Instalando PostgreSQL...${NC}"
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            sudo -u postgres createuser -s $USER
            sudo -u postgres createdb construtorpro
            create_database
            run_migrations
            run_seed
            ;;
        2)
            echo -e "${YELLOW}Iniciando PostgreSQL via Docker...${NC}"
            docker-compose -f docker-compose.postgres.yml up -d
            sleep 5
            run_migrations
            run_seed
            ;;
        3)
            check_postgres_server
            create_database
            run_migrations
            run_seed
            ;;
        4)
            echo ""
            echo -e "${YELLOW}Serviços PostgreSQL gratuitos recomendados:${NC}"
            echo ""
            echo "1. Neon (https://neon.tech) - 0.5GB gratuito"
            echo "   - Crie uma conta gratuita"
            echo "   - Copie a connection string"
            echo "   - Atualize DATABASE_URL no .env"
            echo ""
            echo "2. Supabase (https://supabase.com) - 500MB gratuito"
            echo "   - Crie um projeto"
            echo "   - Vá em Settings > Database"
            echo "   - Copie a connection string"
            echo ""
            echo "3. Railway (https://railway.app) - 1GB gratuito"
            echo ""
            echo "Após configurar, edite o arquivo .env com:"
            echo 'DATABASE_URL="postgresql://usuario:senha@host:porta/construtorpro"'
            echo ""
            ;;
        5)
            echo "Saindo..."
            exit 0
            ;;
        *)
            echo -e "${RED}Opção inválida${NC}"
            ;;
    esac
}

# Executar
main
