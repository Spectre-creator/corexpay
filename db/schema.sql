-- ============================================================================
-- CorePay — Schema de produção (v2)
-- Rode no SQL Editor do Supabase. Idempotente.
--
-- Melhorias vs v1:
--   • Integridade: CHECKs de domínio (amount > 0, net = amount - fee, etc.)
--   • FKs consistentes: transactions/deposits/withdrawals/commissions agora
--     referenciam auth.users (mesma origem de profiles.id) — evita órfãos
--     quando um profile é recriado, e simplifica RLS por auth.uid().
--   • Índices: cobertura para queries por status, provider_ref (idempotência
--     de webhook), afiliado e settlement (paid_at/processed_at). Índices
--     parciais para reduzir tamanho (só linhas pending/completed).
--   • UNIQUE (provider, provider_ref) em deposits — bloqueia processamento
--     duplicado de webhook.
--   • Timestamps: updated_at automático via trigger em profiles/wallets/settings.
--   • Concurrency: wallets.version (optimistic lock) para créditos/débitos.
--   • Segurança: SET search_path = public, pg_temp em SECURITY DEFINER;
--     REVOKE public execute em has_role; policies escritas em blocos DROP+CREATE.
--   • RLS: profiles.blocked/pin_hash/referred_by protegidos contra
--     self-update via WITH CHECK que compara com a linha antiga.
--   • Enum tx_type limpo (sem transfer_in/out — feature removida do produto).
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ─── Enums ─────────────────────────────────────────────────────────────────
do $$ begin
  create type public.app_role  as enum ('admin','user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tx_type   as enum ('deposit','withdraw','commission','adjustment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tx_status as enum ('pending','processing','completed','failed','expired','cancelled');
exception when duplicate_object then null; end $$;

-- ─── Helpers ───────────────────────────────────────────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── profiles ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  telegram_id     bigint unique,
  username        citext unique,
  first_name      text,
  photo_url       text,
  affiliate_code  text not null unique
                    default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
  referred_by     uuid references public.profiles(id) on delete set null,
  pin_hash        text,
  blocked         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint profiles_no_self_referral check (referred_by is null or referred_by <> id),
  constraint profiles_username_len     check (username is null or char_length(username) between 3 and 32),
  constraint profiles_affiliate_fmt    check (affiliate_code ~ '^[A-Z0-9]{6,16}$')
);
create index if not exists profiles_referred_by_idx on public.profiles(referred_by) where referred_by is not null;
create index if not exists profiles_created_at_idx  on public.profiles(created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- ─── wallets ───────────────────────────────────────────────────────────────
create table if not exists public.wallets (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  balance             numeric(14,2) not null default 0,
  total_deposited     numeric(14,2) not null default 0,
  total_withdrawn     numeric(14,2) not null default 0,
  affiliate_earnings  numeric(14,2) not null default 0,
  referrals_count     integer       not null default 0,
  version             bigint        not null default 0,   -- optimistic lock
  updated_at          timestamptz   not null default now(),
  constraint wallets_balance_nonneg   check (balance            >= 0),
  constraint wallets_totals_nonneg    check (total_deposited    >= 0
                                         and total_withdrawn    >= 0
                                         and affiliate_earnings >= 0
                                         and referrals_count    >= 0)
);

drop trigger if exists wallets_set_updated_at on public.wallets;
create trigger wallets_set_updated_at before update on public.wallets
  for each row execute function public.tg_set_updated_at();

-- ─── transactions ──────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          public.tx_type   not null,
  amount        numeric(14,2)    not null,
  fee           numeric(14,2)    not null default 0,
  status        public.tx_status not null default 'completed',
  description   text,
  counterpart   text,
  reference_id  uuid,
  created_at    timestamptz not null default now(),
  constraint transactions_amount_positive check (amount > 0),
  constraint transactions_fee_nonneg      check (fee   >= 0 and fee <= amount)
);
create index if not exists transactions_user_created_idx on public.transactions(user_id, created_at desc);
create index if not exists transactions_status_idx       on public.transactions(status) where status <> 'completed';
create index if not exists transactions_type_created_idx on public.transactions(type, created_at desc);
create index if not exists transactions_reference_idx    on public.transactions(reference_id) where reference_id is not null;

-- ─── deposits ──────────────────────────────────────────────────────────────
create table if not exists public.deposits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  amount        numeric(14,2) not null,
  pix_code      text,
  qr_code       text,
  status        public.tx_status not null default 'pending',
  provider      text,
  provider_ref  text,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz,
  paid_at       timestamptz,
  constraint deposits_amount_positive check (amount > 0),
  constraint deposits_expiry_after    check (expires_at is null or expires_at > created_at),
  constraint deposits_paid_when_done  check ((status = 'completed') = (paid_at is not null))
);
create unique index if not exists deposits_provider_ref_uk
  on public.deposits(provider, provider_ref)
  where provider is not null and provider_ref is not null;
create index if not exists deposits_user_created_idx on public.deposits(user_id, created_at desc);
create index if not exists deposits_pending_idx      on public.deposits(status, expires_at)
  where status in ('pending','processing');

-- ─── withdrawals ───────────────────────────────────────────────────────────
create table if not exists public.withdrawals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  pix_key       text not null,
  amount        numeric(14,2) not null,
  fee           numeric(14,2) not null default 0,
  net           numeric(14,2) not null,
  status        public.tx_status not null default 'pending',
  provider      text,
  provider_ref  text,
  created_at    timestamptz not null default now(),
  processed_at  timestamptz,
  constraint withdrawals_amount_positive check (amount > 0),
  constraint withdrawals_fee_valid       check (fee >= 0 and fee < amount),
  constraint withdrawals_net_matches     check (net = amount - fee),
  constraint withdrawals_processed_when  check (
    (status in ('completed','failed','cancelled')) = (processed_at is not null))
);
create index if not exists withdrawals_user_created_idx on public.withdrawals(user_id, created_at desc);
create index if not exists withdrawals_pending_idx      on public.withdrawals(created_at)
  where status in ('pending','processing');
create unique index if not exists withdrawals_provider_ref_uk
  on public.withdrawals(provider, provider_ref)
  where provider is not null and provider_ref is not null;

-- ─── affiliates ────────────────────────────────────────────────────────────
create table if not exists public.affiliates (
  referrer_id  uuid not null references auth.users(id) on delete cascade,
  referred_id  uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (referrer_id, referred_id),
  constraint affiliates_no_self check (referrer_id <> referred_id)
);
create unique index if not exists affiliates_referred_uk on public.affiliates(referred_id); -- 1 referrer por indicado
create index if not exists affiliates_referrer_idx       on public.affiliates(referrer_id, created_at desc);

-- ─── commissions ───────────────────────────────────────────────────────────
create table if not exists public.commissions (
  id              uuid primary key default gen_random_uuid(),
  referrer_id     uuid not null references auth.users(id) on delete cascade,
  referred_id     uuid not null references auth.users(id) on delete cascade,
  transaction_id  uuid references public.transactions(id) on delete set null,
  amount          numeric(14,2) not null,
  status          public.tx_status not null default 'pending',
  created_at      timestamptz not null default now(),
  constraint commissions_amount_positive check (amount > 0),
  constraint commissions_no_self         check (referrer_id <> referred_id)
);
create index if not exists commissions_referrer_idx  on public.commissions(referrer_id, created_at desc);
create index if not exists commissions_referred_idx  on public.commissions(referred_id, created_at desc);
create index if not exists commissions_pending_idx   on public.commissions(status) where status = 'pending';
create unique index if not exists commissions_tx_uk  on public.commissions(transaction_id)
  where transaction_id is not null;

-- ─── settings ──────────────────────────────────────────────────────────────
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.tg_set_updated_at();

-- ─── user_roles (RBAC) ─────────────────────────────────────────────────────
create table if not exists public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        public.app_role not null,
  created_at  timestamptz not null default now(),
  unique (user_id, role)
);
create index if not exists user_roles_user_idx on public.user_roles(user_id);

-- ─── admin_logs (auditoria) ────────────────────────────────────────────────
create table if not exists public.admin_logs (
  id              uuid primary key default gen_random_uuid(),
  admin_id        uuid not null references auth.users(id) on delete cascade,
  action          text not null,
  target_user_id  uuid references auth.users(id) on delete set null,
  metadata        jsonb,
  ip              inet,
  created_at      timestamptz not null default now()
);
create index if not exists admin_logs_admin_idx   on public.admin_logs(admin_id, created_at desc);
create index if not exists admin_logs_target_idx  on public.admin_logs(target_user_id, created_at desc)
  where target_user_id is not null;
create index if not exists admin_logs_action_idx  on public.admin_logs(action, created_at desc);

-- ─── login_history ─────────────────────────────────────────────────────────
create table if not exists public.login_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  ip          inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists login_history_user_idx on public.login_history(user_id, created_at desc);

-- ============================================================================
-- GRANTs (Data API / PostgREST)
-- ============================================================================
grant usage on schema public to anon, authenticated;

grant select, insert, update          on public.profiles       to authenticated;
grant select, insert, update          on public.wallets        to authenticated;
grant select                          on public.transactions   to authenticated;
grant select, insert                  on public.deposits       to authenticated;
grant select, insert                  on public.withdrawals    to authenticated;
grant select                          on public.affiliates     to authenticated;
grant select                          on public.commissions    to authenticated;
grant select                          on public.settings       to authenticated, anon;
grant select                          on public.user_roles     to authenticated;
grant select, insert                  on public.login_history  to authenticated;
grant select                          on public.admin_logs     to authenticated;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ============================================================================
-- has_role (SECURITY DEFINER, evita recursão em RLS)
-- ============================================================================
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke all      on function public.has_role(uuid, public.app_role) from public;
grant  execute  on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.wallets       enable row level security;
alter table public.transactions  enable row level security;
alter table public.deposits      enable row level security;
alter table public.withdrawals   enable row level security;
alter table public.affiliates    enable row level security;
alter table public.commissions   enable row level security;
alter table public.settings      enable row level security;
alter table public.user_roles    enable row level security;
alter table public.admin_logs    enable row level security;
alter table public.login_history enable row level security;

-- profiles
drop policy if exists "profiles: select"       on public.profiles;
drop policy if exists "profiles: self insert"  on public.profiles;
drop policy if exists "profiles: self update"  on public.profiles;
drop policy if exists "profiles: admin update" on public.profiles;

create policy "profiles: select" on public.profiles
  for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(),'admin'));

create policy "profiles: self insert" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

-- self-update sem alterar campos sensíveis (bloqueio, PIN, referred_by, código)
create policy "profiles: self update" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and blocked        = (select p.blocked        from public.profiles p where p.id = auth.uid())
    and pin_hash       is not distinct from (select p.pin_hash from public.profiles p where p.id = auth.uid())
    and referred_by    is not distinct from (select p.referred_by from public.profiles p where p.id = auth.uid())
    and affiliate_code = (select p.affiliate_code from public.profiles p where p.id = auth.uid())
  );

create policy "profiles: admin update" on public.profiles
  for update to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- wallets (leitura própria; escrita apenas admin/service_role — saldo é sagrado)
drop policy if exists "wallets: select"        on public.wallets;
drop policy if exists "wallets: self insert"   on public.wallets;
drop policy if exists "wallets: admin update"  on public.wallets;

create policy "wallets: select" on public.wallets
  for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create policy "wallets: admin update" on public.wallets
  for update to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- transactions (somente leitura pelo dono/admin; escrita por service_role)
drop policy if exists "tx: select" on public.transactions;
create policy "tx: select" on public.transactions
  for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- deposits
drop policy if exists "dep: select"     on public.deposits;
drop policy if exists "dep: self insert" on public.deposits;
create policy "dep: select" on public.deposits
  for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "dep: self insert" on public.deposits
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending' and paid_at is null);

-- withdrawals
drop policy if exists "wd: select"       on public.withdrawals;
drop policy if exists "wd: self insert"  on public.withdrawals;
drop policy if exists "wd: admin update" on public.withdrawals;
create policy "wd: select" on public.withdrawals
  for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "wd: self insert" on public.withdrawals
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending' and processed_at is null);
create policy "wd: admin update" on public.withdrawals
  for update to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- affiliates / commissions (read-only pelo interessado; escrita = service_role)
drop policy if exists "aff: select" on public.affiliates;
create policy "aff: select" on public.affiliates
  for select to authenticated
  using (auth.uid() in (referrer_id, referred_id) or public.has_role(auth.uid(),'admin'));

drop policy if exists "com: select" on public.commissions;
create policy "com: select" on public.commissions
  for select to authenticated
  using (auth.uid() = referrer_id or public.has_role(auth.uid(),'admin'));

-- settings (leitura pública; escrita apenas admin)
drop policy if exists "set: read"        on public.settings;
drop policy if exists "set: admin write" on public.settings;
create policy "set: read" on public.settings
  for select to anon, authenticated using (true);
create policy "set: admin write" on public.settings
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- user_roles
drop policy if exists "roles: self select" on public.user_roles;
drop policy if exists "roles: admin write" on public.user_roles;
create policy "roles: self select" on public.user_roles
  for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "roles: admin write" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- admin_logs
drop policy if exists "logs: admin read"   on public.admin_logs;
drop policy if exists "logs: admin insert" on public.admin_logs;
create policy "logs: admin read" on public.admin_logs
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "logs: admin insert" on public.admin_logs
  for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') and admin_id = auth.uid());

-- login_history
drop policy if exists "lh: self select" on public.login_history;
drop policy if exists "lh: self insert" on public.login_history;
create policy "lh: self select" on public.login_history
  for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "lh: self insert" on public.login_history
  for insert to authenticated
  with check (auth.uid() = user_id);

-- ============================================================================
-- Trigger: cria profile + wallet + role 'user' ao registrar em auth.users
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ref uuid;
begin
  -- vincula referrer se veio no metadata (código de afiliado)
  select p.id into v_ref
    from public.profiles p
   where p.affiliate_code = upper(nullif(new.raw_user_meta_data->>'ref_code',''))
   limit 1;

  insert into public.profiles (id, username, first_name, photo_url, telegram_id, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email,''),'@',1)),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    new.raw_user_meta_data->>'photo_url',
    nullif(new.raw_user_meta_data->>'telegram_id','')::bigint,
    v_ref
  ) on conflict (id) do nothing;

  insert into public.wallets (user_id)              values (new.id) on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role)     values (new.id, 'user') on conflict do nothing;

  if v_ref is not null then
    insert into public.affiliates (referrer_id, referred_id) values (v_ref, new.id)
      on conflict do nothing;
    update public.wallets set referrals_count = referrals_count + 1 where user_id = v_ref;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Defaults
-- ============================================================================
insert into public.settings(key, value) values
  ('platform', jsonb_build_object(
      'withdrawFeePercent',        2.5,
      'minWithdraw',               20,
      'maxWithdraw',               5000,
      'affiliateCommissionPercent',10,
      'depositExpiryMinutes',      30
  ))
on conflict (key) do nothing;
