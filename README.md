# ConstrutorPro

**Plataforma Premium de Gestão de Construção para o Mercado Brasileiro**

![ConstrutorPro](https://construtorpro.com.br/og-image.png)

## 📋 Sobre

ConstrutorPro é uma plataforma SaaS completa para gestão de obras e construção civil, desenvolvida especificamente para o mercado brasileiro. Oferece controle total de projetos, orçamentos, cronogramas, fornecedores, diário de obra e muito mais.

### ✨ Funcionalidades Principais

- **🏗️ Gestão de Projetos** - Controle completo do ciclo de vida dos projetos
- **📊 Orçamentos** - Criação de orçamentos detalhados com composições de preços (SINAPI/TCPO)
- **📅 Cronograma Físico-Financeiro** - Planejamento e acompanhamento integrado
- **📝 Diário de Obra Digital** - Registro completo de atividades e ocorrências
- **💰 Módulo Financeiro** - Controle de receitas, despesas e fluxo de caixa
- **🤖 Assistente IA** - Inteligência artificial especializada em construção civil
- **📈 Dashboards Executivos** - Métricas e relatórios em tempo real
- **👥 Multi-tenancy** - Isolamento completo de dados por empresa

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- Bun (recomendado) ou npm/yarn/pnpm
- SQLite (desenvolvimento) ou PostgreSQL (produção)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/construtorpro/construtorpro.git
cd construtorpro

# Instale as dependências
bun install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Execute as migrações do banco de dados
bunx prisma migrate dev

# (Opcional) Popule o banco com dados de demonstração
bunx prisma db seed

# Inicie o servidor de desenvolvimento
bun dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

### Credenciais de Teste

**Master Admin:**
- Email: admin@construtorpro.com
- Password: admin123

**Company Admin:**
- Email: carlos@democonstrutora.com.br
- Password: admin123

**Outros perfis disponíveis:**
- maria@democonstrutora.com.br (Gerente)
- joao@democonstrutora.com.br (Engenheiro)
- ana@democonstrutora.com.br (Financeiro)
- pedro@democonstrutora.com.br (Compras)
- lucas@democonstrutora.com.br (Operações)
- julia@democonstrutora.com.br (Visualizador)

## 🏗️ Arquitetura

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Páginas de autenticação
│   ├── (dashboard)/         # Aplicação principal autenticada
│   ├── (public)/            # Páginas públicas (landing, preços, etc.)
│   └── api/                 # API Routes
├── components/
│   ├── ui/                  # Componentes shadcn/ui
│   └── layout/              # Componentes de layout (Sidebar, Header)
├── hooks/                   # Custom React hooks
├── lib/                     # Utilitários e configurações
│   ├── auth.ts             # Configuração NextAuth
│   ├── db.ts               # Cliente Prisma
│   ├── api.ts              # Utilitários de API
│   └── constants.ts        # Constantes da aplicação
├── server/
│   └── auth/               # Autorização server-side
├── types/                   # Definições TypeScript
└── validators/             # Schemas Zod para validação
```

## 🔐 Sistema de Permissões

### Funções de Usuário

| Função | Nível | Descrição |
|--------|-------|-----------|
| `master_admin` | 100 | Acesso total ao sistema, gestão de empresas |
| `company_admin` | 90 | Administrador da empresa com acesso completo |
| `manager` | 70 | Gestão de projetos, orçamentos e equipe |
| `engineer` | 50 | Acesso a projetos, cronogramas e diário de obra |
| `finance` | 50 | Acesso ao módulo financeiro e relatórios |
| `procurement` | 50 | Gestão de fornecedores, materiais e composições |
| `operations` | 30 | Acesso operacional a projetos e diário de obra |
| `viewer` | 10 | Apenas visualização de dados |

### Guardas de Autorização

```typescript
import { requireAuth, requireRole, requireMasterAdmin, requireCompanyAccess } from '@/server/auth';

// Verificar autenticação
const authResult = await requireAuth();

// Verificar role específica
const authResult = await requireRole('manager');

// Verificar master admin
const authResult = await requireMasterAdmin();

// Verificar acesso à empresa
const authResult = await requireCompanyAccess(companyId);
```

## 📦 Módulos

### Dashboard
Métricas consolidadas de projetos, financeiro e operações com gráficos e indicadores.

### Projetos
Gestão completa de projetos com status, progresso físico/financeiro, equipe e documentação.

### Clientes e Fornecedores
Cadastros completos com informações de contato, documentos e histórico.

### Orçamentos
Criação de orçamentos com composições de preços, aprovação workflow e versionamento.

### Composições
Banco de composições de preços com custos de materiais, mão de obra e equipamentos.

### Materiais
Catálogo de materiais com preços, estoque e fornecedores vinculados.

### Cronograma
Planejamento de atividades com diagrama de Gantt e marcos.

### Diário de Obra
Registro diário de atividades, ocorrências, condições climáticas e fotos.

### Financeiro
Controle de contas a pagar/receber, fluxo de caixa e relatórios financeiros.

### Assistente IA
Chat inteligente especializado em construção civil com contexto do negócio.

### Administração (Master Admin)
Painel de gestão do SaaS com KPIs, gestão de empresas e usuários.

## 🛠️ Tecnologias

- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **Banco de Dados:** Prisma ORM (SQLite/PostgreSQL)
- **Autenticação:** NextAuth.js
- **UI:** shadcn/ui + Tailwind CSS
- **Validação:** Zod
- **Gráficos:** Recharts

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
bun dev

# Build para produção
bun build

# Iniciar em produção
bun start

# Linting
bun lint

# Migrações do banco
bunx prisma migrate dev
bunx prisma migrate deploy

# Studio Prisma
bunx prisma studio

# Seed do banco
bunx prisma db seed
```

## 🔧 Configuração de Produção

### Variáveis de Ambiente Obrigatórias

```env
DATABASE_URL="postgresql://user:password@host:5432/db"
NEXTAUTH_SECRET="sua-chave-secreta"
NEXTAUTH_URL="https://seu-dominio.com"
JWT_SECRET="sua-chave-jwt"
```

### Deploy

1. Configure as variáveis de ambiente
2. Execute as migrações: `bunx prisma migrate deploy`
3. Build da aplicação: `bun build`
4. Inicie o servidor: `bun start`

### Docker

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
RUN bun build

FROM base AS release
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "server.js"]
```

## 📄 Licença

Proprietary - Todos os direitos reservados.

## 🤝 Contribuição

Este é um projeto privado. Para contribuir, entre em contato com a equipe de desenvolvimento.

## 📞 Suporte

- **Email:** suporte@construtorpro.com.br
- **Documentação:** https://docs.construtorpro.com.br
- **Status:** https://status.construtorpro.com.br

---

Desenvolvido com ❤️ no Brasil 🇧🇷
