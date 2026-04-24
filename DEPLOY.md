# =============================================================================
# ConstrutorPro - Guia de Deploy
# =============================================================================
# Este guia contém todos os passos para colocar o sistema online
# =============================================================================

## 📋 CHECKLIST PRÉ-DEPLOY

### 1. Credenciais Necessárias

| Serviço | Onde obter | Obrigatório |
|---------|------------|-------------|
| PostgreSQL | Vercel Postgres, Neon, Supabase, Railway | ✅ Sim |
| MercadoPago | https://www.mercadopago.com.br/developers/panel | ✅ Sim |
| Hospedagem | Vercel, Railway, Render, ou VPS | ✅ Sim |

### 2. Variáveis de Ambiente Obrigatórias

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="string-aleatoria-32-caracteres"
NEXTAUTH_URL="https://seu-dominio.com"
NEXT_PUBLIC_APP_URL="https://seu-dominio.com"
MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="APP_USR-..."
```

---

## 🚀 OPÇÃO 1: VERCEL (RECOMENDADO - MAIS FÁCIL)

### Passo 1: Preparar Conta
1. Acesse https://vercel.com
2. Crie uma conta (pode usar GitHub)
3. Conecte seu repositório

### Passo 2: Criar Banco de Dados
1. No Vercel, vá em **Storage** → **Create Database**
2. Escolha **Postgres**
3. Dê o nome `construtorpro-db`
4. Copie a `DATABASE_URL` gerada

### Passo 3: Configurar Variáveis
No Vercel, vá em **Settings** → **Environment Variables** e adicione:

```
DATABASE_URL=[sua-string-postgres]
NEXTAUTH_SECRET=[gere-em: https://generate-secret.vercel.app/32]
NEXTAUTH_URL=https://seu-projeto.vercel.app
NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app
MERCADOPAGO_ACCESS_TOKEN=[seu-token-mercadopago]
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=[sua-public-key]
MERCADOPAGO_WEBHOOK_SECRET=[crie-uma-senha-aleatoria]
MERCADOPAGO_SANDBOX=false
```

### Passo 4: Deploy
1. Clique em **Deploy**
2. Aguarde o build completar
3. Acesse sua URL

### Passo 5: Configurar Webhook MercadoPago
1. No painel do MercadoPago, vá em **Webhooks**
2. Adicione a URL: `https://seu-dominio.com/api/webhooks/mercadopago`
3. Selecione os eventos: `payment`, `subscription`

### Passo 6: Migrar Banco de Dados
Após o primeiro deploy, execute no terminal local:

```bash
# Configurar DATABASE_URL de produção no .env temporariamente
npx prisma migrate deploy
npx prisma db seed
```

---

## 🚀 OPÇÃO 2: RAILWAY

### Passo 1: Criar Conta
1. Acesse https://railway.app
2. Login com GitHub

### Passo 2: Criar Projeto
1. **New Project** → **Deploy from GitHub repo**
2. Selecione o repositório

### Passo 3: Adicionar PostgreSQL
1. **New** → **Database** → **PostgreSQL**
2. Railway criará automaticamente a `DATABASE_URL`

### Passo 4: Configurar Variáveis
Em **Variables**, adicione todas as variáveis do `.env.example`

### Passo 5: Deploy
1. Railway fará deploy automático
2. Configure domínio personalizado em **Settings** → **Domains**

---

## 🚀 OPÇÃO 3: DOCKER (VPS PRÓPRIO)

### Passo 1: Preparar Servidor
```bash
# Conecte ao seu servidor VPS
ssh root@seu-servidor

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Instalar Docker Compose
apt install docker-compose-plugin
```

### Passo 2: Clonar e Configurar
```bash
git clone https://github.com/seu-usuario/construtorpro.git
cd construtorpro

# Criar arquivo .env
cp .env.example .env
nano .env  # Edite com suas variáveis
```

### Passo 3: Deploy com Docker
```bash
docker compose up -d

# Migrar banco
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

### Passo 4: Configurar Proxy Reverso
O Caddyfile já está configurado. Edite o domínio:
```bash
nano Caddyfile
# Altere "localhost" para seu domínio
```

---

## 🔧 COMANDOS ÚTEIS

### Desenvolvimento Local
```bash
npm install              # Instalar dependências
npm run dev              # Iniciar desenvolvimento
npx prisma migrate dev   # Criar migração
npx prisma studio        # Visualizar banco
npx prisma db seed       # Popular dados iniciais
```

### Produção
```bash
npm run build            # Build para produção
npm run start            # Iniciar produção
npx prisma migrate deploy # Aplicar migrações
```

### Verificar Status
```bash
npm run build            # Testar build
npx prisma validate      # Validar schema
npx tsc --noEmit         # Verificar tipos
```

---

## 🌐 CONFIGURAR DOMÍNIO PRÓPRIO

### No Vercel
1. **Settings** → **Domains**
2. Adicione seu domínio
3. Configure DNS conforme instruído

### No Railway
1. **Settings** → **Domains**
2. Adicione domínio customizado
3. Configure DNS

### DNS Records (Cloudflare, etc.)
```
Tipo: A
Nome: @
Valor: [IP do servidor]

Tipo: CNAME
Nome: www
Valor: [url-da-hospedagem]
```

---

## 🧪 TESTAR PRODUÇÃO

### 1. Testar Registro
- Acesse a URL de produção
- Registre uma nova empresa
- Verifique se o trial foi ativado

### 2. Testar Login
- Faça login com o usuário criado
- Verifique se o dashboard carrega

### 3. Testar Pagamento (Sandbox)
- Use cartões de teste do MercadoPago
- Verifique se a assinatura é ativada

### 4. Verificar Logs
- Vercel: **Deployments** → [deploy] → **Logs**
- Railway: **Deployments** → [deploy] → **Logs**

---

## 🆘 PROBLEMAS COMUNS

### Build falha
```bash
# Limpar cache e reinstalar
rm -rf node_modules .next
npm install
npm run build
```

### Erro de banco de dados
```bash
# Recriar banco (CUIDADO: apaga dados)
npx prisma migrate reset
npx prisma db seed
```

### Webhook não funciona
1. Verifique se a URL está acessível publicamente
2. Confirme o webhook secret
3. Verifique logs do MercadoPago

### Login não funciona
1. Verifique NEXTAUTH_SECRET e NEXTAUTH_URL
2. Limpe cookies do navegador
3. Verifique logs do servidor

---

## 📞 SUPORTE

### Logs
- **Vercel:** Project → Deployments → [deploy] → Logs
- **Railway:** Project → [service] → Deployments → Logs

### Banco de Dados
```bash
# Verificar conexão
npx prisma db pull

# Resetar banco (desenvolvimento apenas)
npx prisma migrate reset
```

### Variáveis de Ambiente
- Nunca commite `.env` no git
- Use o painel da plataforma de hospedagem
- Reinicie a aplicação após alterar variáveis

---

## ✅ CHECKLIST FINAL

- [ ] Banco PostgreSQL criado e acessível
- [ ] Variáveis de ambiente configuradas
- [ ] Build passando sem erros
- [ ] Migrações aplicadas no banco
- [ ] Dados iniciais (seed) inseridos
- [ ] Domínio configurado (opcional)
- [ ] SSL/HTTPS funcionando
- [ ] MercadoPago configurado
- [ ] Webhook configurado
- [ ] Testou registro de nova empresa
- [ ] Testou fluxo de pagamento

**Sistema pronto!** 🎉
