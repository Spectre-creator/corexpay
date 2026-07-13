# CorePay — Backend

## Estado atual

- Frontend 100% pronto em `src/routes/`.
- Camada de dados isolada em **`src/lib/api/index.ts`** — é o único lugar que as telas leem/escrevem.
- Cliente Supabase em `src/integrations/supabase/client.ts` (lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).
- Migration completa em `supabase/migrations/20260713120000_init_corepay.sql`.
- Sem essas variáveis, o app roda com mocks (`src/lib/mock-data.ts`) — nada quebra.

## Conectando ao Supabase

1. Crie o projeto em https://supabase.com.
2. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Abra o **SQL Editor** do Supabase e cole o conteúdo de `supabase/migrations/20260713120000_init_corepay.sql`. Rode.
4. Em **Authentication → Providers**, habilite Email + Password (para admin).
5. Crie o primeiro admin manualmente:
   ```sql
   insert into public.user_roles (user_id, role)
   values ('<UUID do usuário criado no Auth>', 'admin');
   ```
6. Reinicie o dev server. As telas passam a consumir Supabase automaticamente.

## Tabelas

| Tabela | Descrição |
|---|---|
| `profiles` | Dados do usuário (Telegram ID, username, foto, código de afiliado, PIN) |
| `wallets` | Saldo e agregados por usuário |
| `transactions` | Histórico unificado (depósito, saque, transferência, comissão) |
| `deposits` | PIX gerados (QR/copia-e-cola, status, provider) |
| `withdrawals` | Solicitações de saque (aprovação admin) |
| `affiliates` | Relação referrer ↔ referred |
| `commissions` | Comissões geradas por indicados |
| `settings` | Configurações da plataforma (taxa, limites, %) |
| `user_roles` | RBAC (admin/user) — separada por segurança |
| `admin_logs` | Auditoria de ações admin |
| `login_history` | Registro de IP/UA para segurança |

## RLS

- Todas as tabelas têm RLS habilitado.
- Usuários enxergam apenas seus próprios dados; admin (via `has_role`) enxerga tudo.
- Escritas privilegiadas (aprovar saque, ajustar saldo, mudar taxa) só passam para role `admin`.

## Migração para Railway (backend próprio)

Quando quiser sair do Supabase e ter seu Node/NestJS no Railway:

1. Faça `pg_dump` do banco Supabase → restore no PostgreSQL do Railway (o schema em `supabase/migrations/` já é PG puro).
2. No backend Node, exponha endpoints REST equivalentes (`GET /wallet`, `GET /transactions`, `POST /deposits`, etc.).
3. Reescreva **apenas** `src/lib/api/index.ts` trocando `supabase.from(...)` por `fetch(import.meta.env.VITE_API_URL + "/...")`.
4. Reimplemente `getCurrentUser()` validando o `initData` do Telegram (HMAC-SHA256 com `TELEGRAM_BOT_TOKEN`) e emitindo JWT próprio.
5. Nenhuma tela em `src/routes/` precisa mudar.

## Integração PIX (futuro)

O modelo `deposits` já tem colunas `provider`, `provider_ref`, `qr_code`, `pix_code`, `expires_at`, `paid_at`. Basta um webhook (Efí, Mercado Pago, Pagar.me, etc.) que:

1. Recebe callback do provider.
2. Atualiza `deposits.status = 'completed'` e `paid_at`.
3. Insere em `transactions` e incrementa `wallets.balance` (transação atômica ou trigger).
4. Se `profiles.referred_by` não é null, insere em `commissions` conforme `settings.platform.affiliateCommissionPercent`.
