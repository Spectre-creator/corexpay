import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users as UsersIcon,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  Settings2,
  Ban,
  Check,
  X,
  Search,
  Lock,
  Plug,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusPill } from "@/components/shared/StatusPill";
import { useAuth, signOut } from "@/hooks/useAuth";
import { mockApi, gatewaysApi, appSettingsApi } from "@/lib/api";
import { formatBRL, formatDate } from "@/utils/format";
import type { AdminUser, AdminWithdrawal, GatewayId } from "@/types";

export function AdminPage() {
  const { session, loading, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        </div>
        <div className="glass-strong rounded-3xl p-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl gradient-brand text-primary-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-xs text-muted-foreground">Faça login para acessar o painel administrativo.</p>
          <Button onClick={() => navigate({ to: "/auth" })} className="mt-6 w-full rounded-2xl py-6">Ir para login</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <div className="glass-strong rounded-3xl p-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/20 text-destructive">
            <Ban className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Sem permissão</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Logado como <span className="font-mono">{user?.email}</span>, mas sem role <span className="font-mono">admin</span>.
          </p>
          <Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/auth" }); }} className="mt-6 w-full rounded-2xl py-5">Sair</Button>
        </div>
      </div>
    );
  }

  return <AdminDashboard email={user?.email ?? ""} onLogout={async () => { await signOut(); navigate({ to: "/auth" }); }} />;
}


function AdminDashboard({ email, onLogout }: { email: string; onLogout: () => void }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 md:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-brand text-primary-foreground">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Painel Admin</h1>
            <p className="text-xs text-muted-foreground">CorePay · {email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-muted-foreground">Ver app</Link>
          <button onClick={onLogout} className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">Sair</button>
        </div>
      </header>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-5 flex w-full flex-wrap gap-1 rounded-2xl bg-white/5 p-1">
          {[
            { v: "dashboard", l: "Dashboard" },
            { v: "users", l: "Usuários" },
            { v: "withdrawals", l: "Saques" },
            { v: "affiliates", l: "Afiliados" },
            { v: "gateways", l: "Gateways" },
            { v: "integrations", l: "Integrações" },
            { v: "settings", l: "Config." },
          ].map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="flex-1 rounded-xl text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="withdrawals"><WithdrawalsTab /></TabsContent>
        <TabsContent value="affiliates"><AffiliatesTab /></TabsContent>
        <TabsContent value="gateways"><GatewaysTab /></TabsContent>
        <TabsContent value="integrations"><IntegrationsTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const adminStats = mockApi.adminStats();
  const adminChart = mockApi.adminChart();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard icon={<UsersIcon className="h-4 w-4" />} label="Usuários" value={adminStats.totalUsers.toLocaleString("pt-BR")} />
        <KpiCard icon={<Wallet className="h-4 w-4" />} label="Saldo em circulação" value={formatBRL(adminStats.circulatingBalance)} />
        <KpiCard icon={<DollarSign className="h-4 w-4" />} label="Receita do dia" value={formatBRL(adminStats.revenueToday)} tone="positive" />
        <KpiCard icon={<ArrowDownToLine className="h-4 w-4" />} label="Depósitos hoje" value={formatBRL(adminStats.depositsToday)} tone="positive" />
        <KpiCard icon={<ArrowUpFromLine className="h-4 w-4" />} label="Saques hoje" value={formatBRL(adminStats.withdrawalsToday)} />
        <KpiCard icon={<DollarSign className="h-4 w-4" />} label="Receita do mês" value={formatBRL(adminStats.revenueMonth)} tone="positive" />
      </div>

      <div className="glass rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Fluxo — últimos 14 dias</p>
            <p className="text-sm font-semibold">Depósitos vs Saques</p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <BarChart data={adminChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-glass-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="depositos" name="Depósitos" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="saques" name="Saques" fill="var(--color-chart-5)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "positive" }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`mt-1 text-xl font-semibold ${tone === "positive" ? "text-success" : ""}`}>{value}</p>
    </div>
  );
}

function UsersTab() {
  const adminUsers = mockApi.adminUsers();
  const [users, setUsers] = useState<AdminUser[]>(adminUsers);
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => users.filter((u) => !query || u.username.toLowerCase().includes(query.toLowerCase()) || String(u.telegramId).includes(query)),
    [users, query],
  );

  function toggleBlock(id: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, blocked: !u.blocked } : u)));
    toast.success("Status atualizado");
  }

  function adjustBalance(id: string) {
    const raw = window.prompt("Ajuste de saldo (ex: 100 ou -50)");
    if (!raw) return;
    const delta = Number(raw.replace(",", "."));
    if (Number.isNaN(delta)) return toast.error("Valor inválido");
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, balance: +(u.balance + delta).toFixed(2) } : u)));
    toast.success(`Saldo ajustado em ${formatBRL(delta)}`);
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por @username ou Telegram ID" className="rounded-xl bg-white/5 pl-9" />
      </div>

      <div className="glass divide-y divide-white/5 overflow-hidden rounded-2xl">
        {filtered.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
              {u.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">@{u.username}</p>
                {u.blocked && <Badge variant="outline" className="border-destructive/30 bg-destructive/15 text-destructive text-[9px]">Bloqueado</Badge>}
              </div>
              <p className="truncate text-[11px] text-muted-foreground">ID {u.telegramId} · desde {formatDate(u.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{formatBRL(u.balance)}</p>
              <p className="text-[10px] text-muted-foreground">dep. {formatBRL(u.totalDeposited)}</p>
            </div>
            <div className="ml-auto flex gap-1 w-full sm:w-auto">
              <Button size="sm" variant="outline" onClick={() => adjustBalance(u.id)} className="rounded-lg text-xs">Ajustar</Button>
              <Button size="sm" variant={u.blocked ? "outline" : "destructive"} onClick={() => toggleBlock(u.id)} className="rounded-lg text-xs">
                <Ban className="mr-1 h-3 w-3" />
                {u.blocked ? "Desbloquear" : "Bloquear"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WithdrawalsTab() {
  const adminWithdrawals = mockApi.adminWithdrawals();
  const [items, setItems] = useState<AdminWithdrawal[]>(adminWithdrawals);

  function act(id: string, action: "approve" | "reject") {
    setItems((prev) => prev.map((w) => (w.id === id ? { ...w, status: action === "approve" ? "completed" : "failed" } : w)));
    toast.success(action === "approve" ? "Saque aprovado" : "Saque rejeitado");
  }

  return (
    <div className="glass divide-y divide-white/5 overflow-hidden rounded-2xl">
      {items.map((w) => (
        <div key={w.id} className="flex flex-wrap items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{w.user}</p>
              <StatusPill status={w.status} variant="admin" />
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{w.id} · Chave: {w.pixKey} · {formatDate(w.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{formatBRL(w.amount)}</p>
            <p className="text-[10px] text-muted-foreground">líquido {formatBRL(w.net)} · taxa {formatBRL(w.fee)}</p>
          </div>
          {w.status === "pending" && (
            <div className="flex gap-1 w-full sm:w-auto sm:ml-2">
              <Button size="sm" onClick={() => act(w.id, "approve")} className="rounded-lg bg-success text-success-foreground hover:bg-success/90 text-xs">
                <Check className="mr-1 h-3 w-3" /> Aprovar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => act(w.id, "reject")} className="rounded-lg text-xs">
                <X className="mr-1 h-3 w-3" /> Rejeitar
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AffiliatesTab() {
  const adminUsers = mockApi.adminUsers();
  const top = adminUsers.slice(0, 5).map((u, i) => ({ ...u, referrals: 12 - i * 2, commission: 400 - i * 60 }));
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="border-b border-white/5 p-4">
        <p className="text-sm font-semibold">Top afiliados</p>
        <p className="text-xs text-muted-foreground">Ordenado por comissão gerada</p>
      </div>
      <div className="divide-y divide-white/5">
        {top.map((u, i) => (
          <div key={u.id} className="flex items-center gap-3 p-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">@{u.username}</p>
              <p className="text-[11px] text-muted-foreground">{u.referrals} indicações</p>
            </div>
            <p className="text-sm font-semibold text-success">{formatBRL(u.commission)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type SavedState = Record<string, Record<string, string>>;
type StatusState = Record<GatewayId, { enabled: boolean; connected: boolean }>;

function GatewaysTab() {
  const GATEWAYS = gatewaysApi.list();
  const [active, setActive] = useState<GatewayId>("fyhub");
  const [values, setValues] = useState<SavedState>({});
  const [status, setStatus] = useState<StatusState>({
    fyhub: { enabled: true, connected: false },
    mercadopago: { enabled: false, connected: false },
    pagarme: { enabled: false, connected: false },
    efi: { enabled: false, connected: false },
    asaas: { enabled: false, connected: false },
  });
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const current = GATEWAYS.find((g) => g.id === active)!;
  const currentValues = values[active] ?? {};
  const webhookUrl = gatewaysApi.webhookUrl(active);

  function setField(key: string, v: string) {
    setValues((prev) => ({ ...prev, [active]: { ...(prev[active] ?? {}), [key]: v } }));
  }
  function save() {
    const missing = current.fields.filter((f) => !currentValues[f.key]?.trim());
    if (missing.length) return toast.error(`Preencha: ${missing.map((f) => f.label).join(", ")}`);
    setStatus((s) => ({ ...s, [active]: { ...s[active], connected: true, enabled: true } }));
    toast.success(`${current.name} salvo com segurança (mock)`);
  }
  function test() {
    if (!status[active].connected) return toast.error("Salve as credenciais primeiro");
    toast.success(`Conexão com ${current.name} OK (200)`);
  }
  function toggleEnabled() {
    setStatus((s) => ({ ...s, [active]: { ...s[active], enabled: !s[active].enabled } }));
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Plug className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Gateways de Pagamento</p>
            <p className="text-xs text-muted-foreground">
              Configure as credenciais dos provedores PIX. Os valores são armazenados de forma segura no backend (server-side) e nunca expostos ao cliente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-5">
        {GATEWAYS.map((g) => {
          const st = status[g.id];
          const isActive = g.id === active;
          return (
            <button key={g.id} onClick={() => setActive(g.id)} className={`glass rounded-2xl p-3 text-left transition ${isActive ? "ring-2 ring-primary" : "hover:bg-white/5"}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">{g.name}</p>
                {st.connected ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{st.connected ? (st.enabled ? "Ativo" : "Pausado") : "Não conectado"}</p>
            </button>
          );
        })}
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{current.name}</p>
            <p className="text-xs text-muted-foreground">{current.description}</p>
            <a href={current.docsUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-primary underline underline-offset-2">
              Documentação oficial ↗
            </a>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <span className="text-muted-foreground">Ativo</span>
            <input type="checkbox" checked={status[active].enabled} onChange={toggleEnabled} className="h-4 w-4 accent-primary" />
          </label>
        </div>

        <div className="space-y-3">
          {current.fields.map((f) => {
            const isSecret = !!f.secret;
            const revealed = reveal[`${active}:${f.key}`];
            return (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    type={isSecret && !revealed ? "password" : "text"}
                    value={currentValues[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="rounded-xl bg-white/5 font-mono text-xs"
                  />
                  {isSecret && (
                    <Button type="button" variant="outline" size="icon" onClick={() => setReveal((r) => ({ ...r, [`${active}:${f.key}`]: !revealed }))} className="rounded-xl">
                      {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Webhook URL</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-black/30 px-2 py-1 font-mono text-[11px]">{webhookUrl}</code>
            <Button type="button" size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada"); }} className="rounded-lg">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Cole essa URL no painel do provedor para receber confirmações de pagamento.</p>
        </div>

        <div className="mt-5 flex gap-2">
          <Button onClick={save} className="flex-1 rounded-2xl py-6">Salvar credenciais</Button>
          <Button onClick={test} variant="outline" className="rounded-2xl py-6">Testar conexão</Button>
        </div>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Layout demonstrativo — os valores serão persistidos quando o backend estiver conectado.
        </p>
      </div>
    </div>
  );
}

function SettingsTab() {
  const platformSettings = mockApi.platformSettings();
  const [s, setS] = useState(platformSettings);
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-5 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Configurações da plataforma</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Taxa de saque (%)" value={s.withdrawFeePercent} onChange={(v) => setS({ ...s, withdrawFeePercent: v })} step={0.1} />
        <Field label="Comissão afiliado (%)" value={s.affiliateCommissionPercent} onChange={(v) => setS({ ...s, affiliateCommissionPercent: v })} step={0.5} />
        <Field label="Saque mínimo (R$)" value={s.minWithdraw} onChange={(v) => setS({ ...s, minWithdraw: v })} step={1} />
        <Field label="Saque máximo (R$)" value={s.maxWithdraw} onChange={(v) => setS({ ...s, maxWithdraw: v })} step={100} />
      </div>
      <Button onClick={() => toast.success("Configurações salvas (mock)")} className="mt-6 w-full rounded-2xl py-6">Salvar alterações</Button>
    </div>
  );
}

function Field({ label, value, onChange, step }: { label: string; value: number; onChange: (n: number) => void; step: number }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 rounded-xl bg-white/5" />
    </div>
  );
}

function IntegrationsTab() {
  const [botToken, setBotToken] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<{ ok?: boolean; username?: string; error?: string }>({});

  useMemo(() => {
    appSettingsApi.get("telegram_bot_token").then((v) => {
      if (v) setBotToken(v);
      setLoaded(true);
    });
  }, []);

  async function save() {
    if (!botToken.trim()) return toast.error("Informe o token");
    setBusy(true);
    try {
      await appSettingsApi.set("telegram_bot_token", botToken.trim());
      toast.success("Token salvo com segurança");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    if (!botToken.trim()) return toast.error("Informe o token primeiro");
    setBusy(true);
    setStatus({});
    const r = await appSettingsApi.testTelegramBot(botToken.trim());
    setStatus(r);
    if (r.ok) toast.success(`Conectado como @${r.username}`);
    else toast.error(r.error ?? "Falha");
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Plug className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Integrações do sistema</p>
            <p className="text-xs text-muted-foreground">
              Credenciais globais salvas no banco (RLS admin-only). O token do bot é usado pelo servidor para validar o
              login do Mini App via HMAC-SHA256.
            </p>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Telegram Bot</p>
            <p className="text-xs text-muted-foreground">
              Obtenha em <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary underline">@BotFather</a> → /mybots → API Token.
            </p>
          </div>
          {status.ok !== undefined && (
            <Badge variant="outline" className={status.ok ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}>
              {status.ok ? `@${status.username}` : "Falha"}
            </Badge>
          )}
        </div>

        <Label className="text-xs text-muted-foreground">Bot Token</Label>
        <div className="mt-2 flex gap-2">
          <Input
            type={reveal ? "text" : "password"}
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder={loaded ? "123456:AAH...cadeia_do_botfather" : "carregando…"}
            className="rounded-xl bg-white/5 font-mono text-xs"
          />
          <Button type="button" variant="outline" size="icon" onClick={() => setReveal((v) => !v)} className="rounded-xl">
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mt-5 flex gap-2">
          <Button onClick={save} disabled={busy} className="flex-1 rounded-2xl py-6">Salvar</Button>
          <Button onClick={test} disabled={busy} variant="outline" className="rounded-2xl py-6">Testar conexão</Button>
        </div>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Após salvar, o endpoint <code>/api/public/telegram/auth</code> passa a aceitar login do Mini App.
        </p>
      </div>
    </div>
  );
}
