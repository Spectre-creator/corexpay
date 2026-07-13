-- ============================================================================
-- CorePay — Addon: Telegram Mini App auth + admin bootstrap + app_settings
-- Rode ESTE arquivo APÓS db/schema.sql no SQL Editor do Supabase.
-- ============================================================================

-- ─── app_settings ──────────────────────────────────────────────────────────
-- Key/value protegido por RLS. Somente admins leem/escrevem.
-- Guarda TELEGRAM_BOT_TOKEN, credenciais de gateways, etc.
create table if not exists public.app_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

grant select, insert, update, delete on public.app_settings to authenticated;
grant all on public.app_settings to service_role;

alter table public.app_settings enable row level security;

drop policy if exists "settings: admin read"  on public.app_settings;
drop policy if exists "settings: admin write" on public.app_settings;

create policy "settings: admin read" on public.app_settings
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "settings: admin write" on public.app_settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ─── Admin bootstrap ───────────────────────────────────────────────────────
-- Promove automaticamente o email do dono para role='admin' quando confirmado.
-- Padrão seguro: exige email_confirmed_at (evita alguém cadastrar o mesmo email).
create or replace function public.grant_admin_for_owner_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email_confirmed_at is not null
     and lower(new.email) = 'spectreads.x@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_grant_admin on auth.users;
create trigger on_auth_user_created_grant_admin
  after insert on auth.users
  for each row execute function public.grant_admin_for_owner_email();

drop trigger if exists on_auth_user_confirmed_grant_admin on auth.users;
create trigger on_auth_user_confirmed_grant_admin
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.grant_admin_for_owner_email();
