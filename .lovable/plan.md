# CorePay — Carteira Digital (Telegram Mini App)

MVP funcional completo. Backend real (Lovable Cloud/Postgres + server functions TanStack Start). PIX mockado, mas com a estrutura de integração pronta para o gateway **FyHub** (endpoints, webhooks, tabelas de transações compatíveis). Painel admin fora do Telegram com email/senha.

---

## 1. Stack e infraestrutura

- TanStack Start + React + TypeScript + Tailwind v4 (já no template).
- Lovable Cloud (Postgres + Auth + Storage) — habilito no primeiro passo.
- Telegram Web App SDK (`@twa-dev/sdk`) para capturar `initData`.
- Validação HMAC do `initData` server-side (server function) usando `BOT_TOKEN`.
- Sessão do Mini App: após validar `initData`, faço sign-in no Supabase via **Supabase Admin** gerando/atualizando o usuário Telegram e devolvendo uma sessão.

Secrets que vou pedir depois:
- `TELEGRAM_BOT_TOKEN`
- `FYHUB_API_KEY` / `FYHUB_WEBHOOK_SECRET` (deixo variáveis prontas, sem uso real ainda)

---

## 2. Design

- Tema escuro azul-petróleo (`oklch` tokens em `src/styles.css`).
- Glassmorphism (cards `backdrop-blur` + borda translúcida), radius grande.
- Mobile-first, bottom nav fixa (Home / PIX / Extrato / Afiliados / Conta).
- Tipografia limpa (Inter). Gráficos com Recharts.
- Sem cara genérica de template; visual próprio inspirado em Nubank/Binance mas único.

---

## 3. Banco de dados (migrations)

Tabelas em `public` com GRANT + RLS:

- `profiles` — 1:1 com `auth.users`, guarda `telegram_id`, `username`, `first_name`, `photo_url`, `pin_hash`, `created_at`, `blocked`.
- `wallets` — `user_id`, `balance`, `total_deposited`, `total_withdrawn`, `affiliate_earnings`.
- `transactions` — histórico unificado (`type`: deposit/withdraw/transfer_in/transfer_out/commission, `amount`, `fee`, `status`, `external_id`, `metadata jsonb`, `created_at`).
- `deposits` — pedido de PIX in (qrcode, copia-cola, expires_at, status, provider, provider_id).
- `withdrawals` — pedido PIX out (pix_key, pix_key_type, amount, fee, net_amount, status, admin_note).
- `affiliates` — `user_id`, `code` único, `referred_by`.
- `commissions` — origem, valor, status (pending/paid), transação associada.
- `settings` — chave/valor (min/max saque, taxa %, comissão afiliado %).
- `admin_logs` — auditoria de ações admin.
- `login_history` — ip, user_agent, timestamp.
- `user_roles` + enum `app_role` + função `has_role` (padrão seguro, sem role em profiles).

RLS: usuário vê só seus dados; admin via `has_role`.

---

## 4. Autenticação

**Mini App (Telegram):**
1. Frontend lê `Telegram.WebApp.initData`.
2. Server function `authTelegram({ initData })` valida HMAC com `BOT_TOKEN`, extrai user, upserta `profiles` + `wallets` + `affiliates.code`, cria/atualiza usuário no Supabase Auth (email fake `tg_<id>@corepay.local`), retorna `access_token` para o client setar sessão.
3. Se veio `start_param` com código de afiliado → grava `referred_by`.

**Admin (separado):** rota `/admin/login` com email+senha do Supabase Auth. Só entra quem tem role `admin` na `user_roles`.

---

## 5. Telas do Mini App

- **/ (Home)** — saldo, cards (depositado/sacado/afiliados/indicações), gráfico Recharts com filtros (Hoje/7/15/30/Total).
- **/pix** — abas: Depositar, Sacar, Transferir.
  - Depositar: input valor → server fn `createDeposit` → gera QR mock (via `qrcode` lib) + copia-cola fake `00020126...`, status pendente/pago/expirado. Botão "Simular pagamento" só em dev.
  - Sacar: chave PIX + valor, mostra taxa e líquido (lidas de `settings`), valida saldo/limites, exige PIN → cria `withdrawals` status `pending`.
  - Transferir: destinatário (username ou telegram_id) + valor → server fn atômica com `SELECT ... FOR UPDATE` (via RPC PL/pgSQL) debitando e creditando.
- **/extrato** — filtros por tipo e período, lista com badge de status.
- **/afiliados** — link `https://t.me/<bot>?start=<code>`, botão copiar, stats (total, ganhos totais/pendentes/pagos), lista de indicados.
- **/conta** — dados Telegram, configurações (tema, notificações, PIN), botão "Sair".

Bottom nav fixo em todas as rotas do app.

---

## 6. Painel admin `/admin/*`

- Login email/senha, gate por `has_role('admin')`.
- Dashboard: total de usuários, saldo em circulação, depósitos/saques do dia, receita (soma de `fee`).
- Listagens: usuários (bloquear/ajustar saldo), depósitos, saques (aprovar/rejeitar → muda status + credita/debita), afiliados, comissões.
- Configurações: taxa %, min/max saque, % comissão afiliado (grava em `settings`).
- Toda ação registra em `admin_logs`.

---

## 7. Integração FyHub (preparada, não ativa)

Pesquiso a documentação pública da FyHub e crio:
- Server functions `fyhub.createPixCharge`, `fyhub.createPixPayout` com implementação stub (retorna mock quando `FYHUB_API_KEY` ausente).
- Rota pública `src/routes/api/public/webhooks/fyhub.ts` validando HMAC (`FYHUB_WEBHOOK_SECRET`) e atualizando `deposits`/`withdrawals` + creditando saldo + registrando comissão do afiliado.
- Quando você adicionar os secrets, o mock desativa sozinho.

---

## 8. Segurança

- Validação HMAC do `initData` sempre server-side.
- PIN 6 dígitos hasheado (bcrypt) exigido em saques/transferências.
- `login_history` grava IP (via `getRequestIP`) e UA.
- Rate limit ad-hoc simples (tabela `rate_limits` com janela) nas ações sensíveis — te aviso que não é a infra ideal.
- Zod validando todos os inputs.

---

## 9. Ordem de execução nesta entrega

1. Enable Lovable Cloud.
2. Migrations (todas as tabelas + RLS + seed de `settings`).
3. Design tokens + shell (bottom nav, layout mobile).
4. Auth Telegram (server fn + hook + guard) — vou precisar do `TELEGRAM_BOT_TOKEN` no meio do caminho.
5. Home + Conta + Afiliados.
6. PIX (depósito mock, saque, transferência) + PIN.
7. Extrato.
8. Admin (login email/senha + dashboard + saques + configs).
9. Stub FyHub + webhook route.
10. Seed de admin (te peço email/senha do primeiro admin).

## Detalhes técnicos

- **RPC transferência atômica:** função PL/pgSQL `transfer_balance(from_user, to_user, amount)` para evitar race.
- **Realtime:** subscription no `deposits` do usuário logado para atualizar status sem refresh.
- **Server fns** protegidos com `requireSupabaseAuth`; admin fns checam `has_role('admin')` antes de importar `supabaseAdmin`.
- **Webhook público:** `/api/public/webhooks/fyhub` — HMAC timing-safe, sem retornar PII.
- **Grants explícitos** em toda tabela nova (`authenticated`, `service_role`; `anon` só onde necessário).

---

## O que vou te pedir durante a execução

1. `TELEGRAM_BOT_TOKEN` (via secure form).
2. Email + senha do primeiro admin.
3. Depois, quando quiser ativar PIX real: `FYHUB_API_KEY` + `FYHUB_WEBHOOK_SECRET`.

Confirma que posso começar por aí?