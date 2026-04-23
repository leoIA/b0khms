# ConstrutorPro - Guia de Configuração do PostgreSQL

## Visão Geral

O ConstrutorPro está configurado para usar PostgreSQL, mas o banco de dados não está instalado no ambiente atual. Siga um dos métodos abaixo para configurar.

---

## 🚀 Opção 1: Docker (Recomendado)

### Pré-requisitos
- Docker e Docker Compose instalados

### Passos

```bash
# 1. Iniciar PostgreSQL via Docker
docker-compose -f docker-compose.postgres.yml up -d

# 2. Aguardar PostgreSQL iniciar (aproximadamente 10 segundos)

# 3. Executar migrations
npx prisma migrate dev --name init

# 4. Popular banco de dados
npx prisma db seed

# 5. Iniciar o servidor
npm run dev
```

### Acessar pgAdmin (opcional)
- URL: http://localhost:5050
- Email: admin@construtorpro.com
- Senha: admin

---

## ☁️ Opção 2: Serviço na Nuvem (Gratuito)

### Neon (Recomendado - 0.5GB gratuito)

1. Acesse https://neon.tech
2. Crie uma conta gratuita
3. Crie um novo projeto
4. Copie a connection string (formato: `postgresql://user:pass@host/db?sslmode=require`)
5. Atualize o arquivo `.env`:
   ```
   DATABASE_URL="sua-connection-string-aqui"
   ```
6. Execute:
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   npm run dev
   ```

### Supabase (500MB gratuito)

1. Acesse https://supabase.com
2. Crie um novo projeto
3. Vá em Settings > Database
4. Copie a connection string
5. Atualize o `.env` e execute os comandos acima

### Railway (1GB gratuito)

1. Acesse https://railway.app
2. Crie um novo projeto PostgreSQL
3. Copie as variáveis de conexão
4. Atualize o `.env` e execute os comandos acima

---

## 💻 Opção 3: Instalação Local

### Ubuntu/Debian

```bash
# Instalar PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Iniciar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Criar banco de dados
sudo -u postgres createdb construtorpro
sudo -u postgres createuser -s $USER

# Executar migrations
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### macOS

```bash
# Usando Homebrew
brew install postgresql@16
brew services start postgresql@16
createdb construtorpro
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### Windows

1. Baixe o instalador em https://www.postgresql.org/download/windows/
2. Execute a instalação
3. Use o pgAdmin para criar o banco `construtorpro`
4. Execute os comandos de migração

---

## ✅ Verificar Configuração

Execute o script de verificação:

```bash
node scripts/check-database.js
```

Ou teste a conexão manualmente:

```bash
npx prisma db pull
```

---

## 🔧 Configuração Atual

O projeto está configurado com:

- **Schema**: `prisma/schema.prisma` (PostgreSQL)
- **Variável de ambiente**: `DATABASE_URL` no arquivo `.env`
- **Scripts**: Configurados no `package.json`

### Comandos Úteis

```bash
# Gerar cliente Prisma
npx prisma generate

# Criar nova migration
npx prisma migrate dev --name descricao

# Resetar banco de dados
npx prisma migrate reset

# Visualizar dados
npx prisma studio

# Verificar status das migrations
npx prisma migrate status
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique se o PostgreSQL está rodando: `pg_isready -h localhost -p 5432`
2. Verifique as credenciais no `.env`
3. Execute `npx prisma generate` para regenerar o cliente
4. Consulte os logs do Docker: `docker logs construtorpro-postgres`
