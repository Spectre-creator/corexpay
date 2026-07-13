// ============================================================================
// Data Access Layer — CorePay
// ----------------------------------------------------------------------------
// Este é o ÚNICO ponto que as telas usam para ler/escrever dados.
// - Quando VITE_SUPABASE_URL/ANON_KEY estiverem preenchidos, usa Supabase.
// - Caso contrário, cai nos mocks em src/lib/mock-data.ts.
//
// MIGRAÇÃO PARA RAILWAY:
// Basta reescrever cada função abaixo trocando `supabase.from(...)` por
// `fetch("/api/...")` apontando para o backend próprio. Nenhuma tela precisa
// ser tocada.
// ============================================================================

import { supabase, db, isSupabaseConfigured } from "@/integrations/supabase/client";
import * as mock from "@/lib/mock-data";
import {
  currentUser as mockCurrentUser,
  transactions as mockTransactions,
  referrals as mockReferrals,
  platformSettings as mockPlatformSettings,
  adminUsers as mockAdminUsers,
  adminWithdrawals as mockAdminWithdrawals,
  adminStats as mockAdminStats,
  adminChart as mockAdminChart,
  chartSeries as mockChartSeries,
} from "@/services/mock-data.service";
import { walletStore } from "@/services/wallet.service";
import { GATEWAYS } from "@/services/gateways.service";
import { adminAuth } from "@/services/admin-auth.service";
import type {
  Wallet,
  Transaction,
  Referral,
  CurrentUser,
  PlatformSettings,
  AdminUser,
  AdminWithdrawal,
  GatewayConfig,
  GatewayId,
} from "@/types";

const API_URL = import.meta.env.VITE_API_BASE_URL;
const useMock = () => !isSupabaseConfigured() || !supabase;

// ============================================================================
// SYNC ACCESSORS (mock-mode). Pages consomem estes helpers; quando o backend
// real estiver conectado, migrar cada página para as versões async abaixo.
// ============================================================================

export const mockApi = {
  currentUser: (): CurrentUser => mockCurrentUser,
  transactions: (): Transaction[] => mockTransactions,
  referrals: (): Referral[] => mockReferrals,
  platformSettings: (): PlatformSettings => mockPlatformSettings,
  adminUsers: (): AdminUser[] => mockAdminUsers,
  adminWithdrawals: (): AdminWithdrawal[] => mockAdminWithdrawals,
  adminStats: () => mockAdminStats,
  adminChart: () => mockAdminChart,
  chartSeries: () => mockChartSeries,
};

// ---- Wallet mutations (mock) ----------------------------------------------
export const walletApi = {
  credit: (amount: number) => walletStore.creditDeposit(amount),
  debit: (amount: number) => walletStore.debitWithdrawal(amount),
};

// ---- Gateways --------------------------------------------------------------
export const gatewaysApi = {
  list: (): GatewayConfig[] => GATEWAYS,
  webhookUrl: (id: GatewayId) => `https://corepay-bot.lovable.app/api/webhooks/${id}`,
  save: async (_id: GatewayId, _values: Record<string, string>) => ({ ok: true as const }),
  test: async (_id: GatewayId) => ({ ok: true as const, status: 200 }),
};

// ---- Admin auth (demo) -----------------------------------------------------
export const adminAuthApi = {
  demoEmail: adminAuth.demoEmail,
  demoPassword: adminAuth.demoPassword,
};

// ---- Auth / usuário atual --------------------------------------------------
export async function getCurrentUser(): Promise<CurrentUser> {
  if (useMock()) return mock.currentUser;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");
  const { data, error } = await db
    .from("profiles")
    .select("telegram_id, username, first_name, photo_url, affiliate_code, created_at, pin_hash")
    .eq("id", auth.user.id)
    .single();
  if (error) throw error;
  return {
    telegramId: Number(data.telegram_id ?? 0),
    username: data.username ?? "",
    firstName: data.first_name ?? "",
    photoUrl: data.photo_url ?? "",
    memberSince: data.created_at,
    pinEnabled: Boolean(data.pin_hash),
    affiliateCode: data.affiliate_code,
  };
}

// ---- Carteira --------------------------------------------------------------
export async function getWallet(): Promise<Wallet> {
  if (useMock()) return mock.wallet;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");
  const { data, error } = await db
    .from("wallets")
    .select("balance, total_deposited, total_withdrawn, affiliate_earnings, referrals_count")
    .eq("user_id", auth.user.id)
    .single();
  if (error) throw error;
  return {
    balance: Number(data.balance),
    totalDeposited: Number(data.total_deposited),
    totalWithdrawn: Number(data.total_withdrawn),
    affiliateEarnings: Number(data.affiliate_earnings),
    referralsCount: data.referrals_count,
  };
}

// ---- Transações ------------------------------------------------------------
export async function listTransactions(): Promise<Transaction[]> {
  if (useMock()) return mock.transactions;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await db
    .from("transactions")
    .select("id, type, amount, fee, status, description, counterpart, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data.map((r: any) => ({
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    fee: r.fee ? Number(r.fee) : undefined,
    status: r.status,
    description: r.description ?? "",
    counterpart: r.counterpart ?? undefined,
    createdAt: r.created_at,
  }));
}

// ---- Configurações da plataforma ------------------------------------------
export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (useMock()) return mock.platformSettings;
  const { data, error } = await db.from("settings").select("value").eq("key", "platform").single();
  if (error) throw error;
  return data.value as unknown as PlatformSettings;
}

// ---- Depósito PIX ----------------------------------------------------------
export async function createDeposit(amount: number): Promise<{ id: string; pixCode: string; qrCode: string }> {
  if (useMock()) {
    return {
      id: `DEP-${Date.now()}`,
      pixCode: "00020126360014BR.GOV.BCB.PIX...MOCKED",
      qrCode: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>`,
    };
  }
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");
  const { data, error } = await db
    .from("deposits")
    .insert({ user_id: auth.user.id, amount, status: "pending" })
    .select("id")
    .single();
  if (error) throw error;
  // Quando o gateway estiver integrado, esses campos virão da resposta do provider.
  return { id: data.id, pixCode: "aguardando_gateway", qrCode: "" };
}

// ---- Saque -----------------------------------------------------------------
export async function requestWithdrawal(pixKey: string, amount: number, fee: number) {
  if (useMock()) return { id: `WD-${Date.now()}` };
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");
  const { data, error } = await db
    .from("withdrawals")
    .insert({ user_id: auth.user.id, pix_key: pixKey, amount, fee, net: amount - fee, status: "pending" })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

// ---- Afiliados -------------------------------------------------------------
export async function listReferrals(): Promise<Referral[]> {
  if (useMock()) return mock.referrals;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await db
    .from("affiliates")
    .select("referred_id, created_at, profiles!affiliates_referred_id_fkey(username)")
    .eq("referrer_id", auth.user.id);
  if (error) throw error;
  // ganhos agregados por indicado
  const { data: coms } = await db
    .from("commissions")
    .select("referred_id, amount, status")
    .eq("referrer_id", auth.user.id);
  const earnedBy = new Map<string, number>();
  (coms ?? []).forEach((c: any) => earnedBy.set(c.referred_id, (earnedBy.get(c.referred_id) ?? 0) + Number(c.amount)));
  return (data ?? []).map((r: any) => ({
    id: r.referred_id,
    username: `@${(r as { profiles?: { username?: string } }).profiles?.username ?? "user"}`,
    joinedAt: r.created_at,
    earned: earnedBy.get(r.referred_id) ?? 0,
    status: (earnedBy.get(r.referred_id) ?? 0) > 0 ? "active" : "inactive",
  }));
}

// ---- Admin -----------------------------------------------------------------
export async function adminListUsers(): Promise<AdminUser[]> {
  if (useMock()) return mock.adminUsers;
  const { data, error } = await db
    .from("profiles")
    .select("id, telegram_id, username, first_name, blocked, created_at, wallets(balance, total_deposited)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.id,
    telegramId: Number(p.telegram_id ?? 0),
    username: p.username ?? "",
    firstName: p.first_name ?? "",
    balance: Number((p as { wallets?: { balance?: number } }).wallets?.balance ?? 0),
    totalDeposited: Number((p as { wallets?: { total_deposited?: number } }).wallets?.total_deposited ?? 0),
    createdAt: p.created_at,
    blocked: p.blocked,
  }));
}

export async function adminListWithdrawals(): Promise<AdminWithdrawal[]> {
  if (useMock()) return mock.adminWithdrawals;
  const { data, error } = await db
    .from("withdrawals")
    .select("id, user_id, pix_key, amount, fee, net, status, created_at, profiles(username)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((w: any) => ({
    id: w.id,
    user: `@${(w as { profiles?: { username?: string } }).profiles?.username ?? "user"}`,
    pixKey: w.pix_key,
    amount: Number(w.amount),
    fee: Number(w.fee),
    net: Number(w.net),
    status: w.status,
    createdAt: w.created_at,
  }));
}

export async function adminApproveWithdrawal(id: string) {
  if (useMock()) return;
  const { error } = await db.from("withdrawals").update({ status: "completed", processed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function adminRejectWithdrawal(id: string) {
  if (useMock()) return;
  const { error } = await db.from("withdrawals").update({ status: "failed", processed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function adminSetBlocked(userId: string, blocked: boolean) {
  if (useMock()) return;
  const { error } = await db.from("profiles").update({ blocked }).eq("id", userId);
  if (error) throw error;
}

export async function adminUpdateSettings(patch: Partial<PlatformSettings>) {
  if (useMock()) return;
  const current = await getPlatformSettings();
  const value = { ...current, ...patch };
  const { error } = await db.from("settings").upsert({ key: "platform", value });
  if (error) throw error;
}

// ---- Auth helpers ----------------------------------------------------------
export async function signInWithPassword(email: string, password: string) {
  if (useMock()) return { user: { id: "mock", email } };
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (useMock()) return;
  await db.auth.signOut();
}

export async function isAdmin(): Promise<boolean> {
  if (useMock()) return true;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return false;
  const { data, error } = await db.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
  if (error) return false;
  return Boolean(data);
}

// ---- App settings (chave/valor protegido por RLS admin-only) ---------------
export const appSettingsApi = {
  async get(key: string): Promise<string | null> {
    if (useMock()) return null;
    const { data, error } = await db.from("app_settings").select("value").eq("key", key).maybeSingle();
    if (error) return null;
    return (data?.value as string | undefined) ?? null;
  },
  async set(key: string, value: string): Promise<void> {
    if (useMock()) throw new Error("Supabase não configurado");
    const { data: auth } = await db.auth.getUser();
    const { error } = await db.from("app_settings").upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: auth.user?.id ?? null,
    });
    if (error) throw error;
  },
  async testTelegramBot(token: string): Promise<{ ok: boolean; username?: string; error?: string }> {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const j = (await r.json()) as { ok: boolean; result?: { username?: string }; description?: string };
      if (j.ok) return { ok: true, username: j.result?.username };
      return { ok: false, error: j.description ?? "Falha desconhecida" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erro de rede" };
    }
  },
};
