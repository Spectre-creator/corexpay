# Deploy — CorePay (Produção)

Guia completo para colocar o CorePay em produção usando **Vercel** (frontend), **Railway** (backend futuro) e **Supabase** (banco + auth).

---

## Arquitetura

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Vercel     │────▶│   Supabase   │◀────│   Railway    │
│ (Front + SSR)│      │ (DB + Auth)  │      │ (API futura) │
└──────────────┘      └──────────────┘      └──────────────┘
        ▲                                          ▲
        │                                          │
        └─── Telegram Mini App ────────────────────┘
```

- **Vercel**: TanStack Start (SSR + server functions) — front + rotas `/api/public/*` (webhook Telegram, etc).
- **Supabase**: Postgres, Auth, RLS. Já está provisionado.
- **Railway**: (opcional/futuro) API própria para PIX, workers, jobs. A DAL `src/lib/api/index.ts` já está desacoplada — troca de URL basta.

---

## Pré-requisitos

- Conta no [Vercel](https://vercel.com)
- Conta no [Railway](https://railway.app) *(opcional agora)*
- Projeto Supabase ativo (`yyclzxnrezjxvpwvwjuv`)
- Bot Telegram criado no [@BotFather](https://t.me/BotFather) com token em mãos
- Repositório Git conectado (GitHub/GitLab/Bitbucket)

---

## 1. Preparar o Supabase (uma vez)

No SQL Editor do Supabase, execute na ordem:

1. `db/schema.sql` — cria todas as tabelas, RLS, triggers.
2. `db/migrations/002_telegram_auth_addon.sql` — adiciona `app_settings` e auto-promoção de admin.

Depois:

- **Authentication → Providers → Email**: habilite. Desmarque "Confirm email" se quiser login imediato do admin.
- **Authentication → URL Configuration**:
  - Site URL: `https://SEU-DOMINIO.vercel.app`
  - Redirect URLs: adicione o mesmo domínio.
- Crie a conta admin em `/auth` do app (email `spectreads.x@gmail.com`) — o trigger promove automaticamente.

---

## 2. Deploy do Frontend no Vercel

### 2.1 Importar o projeto

1. Vercel Dashboard → **Add New → Project**.
2. Importe o repositório Git.
3. **Framework Preset**: `Vite` (TanStack Start é detectado como Vite).
4. **Build Command**: `bun run build` *(ou `npm run build`)*.
5. **Output Directory**: `.output/public` *(padrão TanStack Start — deixe automático se detectar)*.
6. **Install Command**: `bun install` *(ou `npm install`)*.

### 2.2 Environment Variables (CRÍTICO — sem isso o app cai em mock)

Em **Settings → Environment Variables**, adicione para **Production, Preview e Development**:

| Variável | Valor | Escopo |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://yyclzxnrezjxvpwvwjuv.supabase.co` | Client + Server |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | *(anon key do Supabase)* | Client + Server |
| `VITE_SUPABASE_PROJECT_ID` | `yyclzxnrezjxvpwvwjuv` | Client + Server |
| `SUPABASE_URL` | *(mesmo valor acima)* | Server only |
| `SUPABASE_PUBLISHABLE_KEY` | *(mesmo anon key)* | Server only |
| `SUPABASE_SERVICE_ROLE_KEY` | *(service_role key)* ⚠️ **Nunca no client** | Server only |

> ⚠️ **Por que dados fictícios sumem só se as envs estiverem certas:**
> `src/integrations/supabase/client.ts` só instancia o cliente se `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` existirem. Sem elas, `useMock()` retorna `true` e o app renderiza mocks. Prefixo `VITE_` é obrigatório para o Vite injetar no bundle.

### 2.3 Deploy

Clique em **Deploy**. Aguarde ~2 min. Ao final você recebe uma URL `https://corepay-xxx.vercel.app`.

### 2.4 Custom Domain (opcional)

**Settings → Domains → Add** → aponte seu domínio (ex: `app.corepay.com`) e configure o DNS conforme instruído.

Atualize no Supabase:
- **Auth → URL Configuration → Site URL** para o novo domínio.

---

## 3. Configurar o Telegram Mini App

### 3.1 No @BotFather

```
/mybots → escolha seu bot → Bot Settings → Menu Button → Configure Menu Button
```

Cole a URL do Vercel: `https://SEU-DOMINIO.vercel.app`

Ou use `/newapp` para criar um Mini App dedicado.

### 3.2 No painel admin do CorePay

1. Acesse `https://SEU-DOMINIO.vercel.app/auth` e faça login como admin.
2. Vá em **Admin → Integrações**.
3. Cole o **Bot Token** (obtido no BotFather) e clique em **Testar conexão**.
4. Salve. Está pronto para validar login via `initData` do Telegram.

---

## 4. Deploy do Backend no Railway (quando migrar do Supabase Data API para API própria)

> Enquanto todo consumo vive na DAL (`src/lib/api/index.ts`) via Supabase, **você não precisa do Railway ainda**. Use quando quiser lógica pesada de PIX/workers.

### 4.1 Criar projeto

1. Railway Dashboard → **New Project → Deploy from GitHub repo**.
2. Selecione o repositório (pode ser um monorepo ou repo separado `corepay-api`).
3. Railway detecta Node/Bun automaticamente.

### 4.2 Environment Variables

| Variável | Descrição |
|---|---|
| `PORT` | Railway injeta automaticamente — **use `process.env.PORT`** |
| `DATABASE_URL` | Connection string do Supabase (Settings → Database → Connection string → **Transaction pooler**) |
| `SUPABASE_URL` | Igual ao Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Igual ao Vercel |
| `TELEGRAM_BOT_TOKEN` | Token do bot |
| `JWT_SECRET` | Segredo para assinar tokens internos |
| Credenciais dos gateways PIX | FyHub / MercadoPago / etc. |

### 4.3 Domínio público

**Settings → Networking → Generate Domain** — obtém `corepay-api.up.railway.app`.

Prefira domínio próprio: `api.corepay.com` via CNAME.

### 4.4 Apontar o frontend para o Railway

Adicione no Vercel:

```
VITE_API_BASE_URL=https://api.corepay.com
```

E no `src/lib/api/index.ts` troque as chamadas do Supabase por `fetch(import.meta.env.VITE_API_BASE_URL + '/...')` gradualmente, endpoint por endpoint.

---

## 5. Checklist de Produção

Antes de anunciar o app:

- [ ] Envs do Supabase configuradas no Vercel (Production + Preview)
- [ ] Migrations 001 e 002 rodadas no Supabase
- [ ] Admin criado e conseguiu logar em `/auth`
- [ ] Bot Token salvo em Admin → Integrações e teste passou
- [ ] Menu Button do BotFather aponta para o domínio de produção
- [ ] Site URL do Supabase Auth atualizado
- [ ] RLS ativa em todas as tabelas (`select * from pg_tables where schemaname='public'` → verifique `rowsecurity=true`)
- [ ] Testou fluxo completo dentro do Telegram (não só no browser)
- [ ] Custom domain configurado (opcional mas recomendado)

---

## 6. Troubleshooting

### "Vejo dados fictícios em produção"
→ Envs `VITE_SUPABASE_*` faltando no Vercel. Redeploy após adicionar.

### "Abra pelo Telegram" aparece no browser
→ Comportamento esperado. Usuários finais só entram via Telegram; admin usa `/auth` com email/senha.

### Login admin funciona mas não vê painel
→ Migration 002 não rodou (falta trigger de auto-promoção). Rode o SQL e faça logout/login.

### Webhook do Telegram não chega
→ Use a URL **estável** do Vercel (custom domain ou `corepay-xxx.vercel.app`), nunca URLs de preview branch.

### Build falha no Vercel com "Failed to resolve import"
→ Dependência faltando. Rode `bun install` local, commite o `bun.lockb` e refaça deploy.

---

## 7. Custos estimados

| Serviço | Plano recomendado | Custo/mês |
|---|---|---|
| Vercel | Hobby (grátis) até MVP; Pro se >100GB/mês | $0 – $20 |
| Supabase | Free até 500MB/50k MAU; Pro depois | $0 – $25 |
| Railway | Hobby (grátis $5 créditos); Pro conforme uso | $0 – $20+ |
| Telegram Bot API | Grátis | $0 |

MVP roda **de graça** nos três serviços.
