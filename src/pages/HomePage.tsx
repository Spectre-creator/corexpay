import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Eye,
  EyeOff,
  Users,
  Wallet as WalletIcon,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useWalletData } from "@/hooks/useWalletData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTransactions } from "@/hooks/useTransactions";
import { mockApi } from "@/lib/api";
import { formatBRL, formatDate, txLabel } from "@/utils/format";

const ranges = ["today", "7d", "15d", "30d", "total"] as const;
const rangeLabel = { today: "Hoje", "7d": "7 dias", "15d": "15 dias", "30d": "30 dias", total: "Total" } as const;

export function HomePage() {
  const { wallet } = useWalletData();
  const { data: currentUser } = useCurrentUser();
  const { data: transactions = [] } = useTransactions();
  const chartSeries = mockApi.chartSeries();
  const [showBalance, setShowBalance] = useState(true);
  const [range, setRange] = useState<(typeof ranges)[number]>("7d");
  const data = chartSeries[range];
  const recent = useMemo(() => transactions.slice(0, 4), [transactions]);
  const user = currentUser ?? mockApi.currentUser();

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={user.photoUrl}
            alt={user.firstName}
            className="h-11 w-11 rounded-full ring-2 ring-primary/40"
          />
          <div>
            <p className="text-xs text-muted-foreground">Olá,</p>
            <p className="text-sm font-semibold">{user.firstName} 👋</p>
          </div>
        </div>
        <Link to="/conta" className="glass grid h-10 w-10 place-items-center rounded-full text-muted-foreground" aria-label="Conta">
          <ShieldCheck className="h-5 w-5" />
        </Link>
      </div>

      <section className="gradient-balance relative overflow-hidden rounded-3xl border border-glass-border p-5 shadow-[var(--shadow-glow)]">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <WalletIcon className="h-4 w-4" /> Saldo disponível
          </div>
          <button onClick={() => setShowBalance((v) => !v)} className="text-muted-foreground" aria-label="Alternar visibilidade">
            {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-4xl font-bold tracking-tight">
          {showBalance ? formatBRL(wallet.balance) : "R$ ••••••"}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <QuickAction to="/pix" tab="deposit" icon={<ArrowDownToLine className="h-4 w-4" />} label="Depositar" />
          <QuickAction to="/pix" tab="withdraw" icon={<ArrowUpFromLine className="h-4 w-4" />} label="Sacar" />
          <QuickAction to="/afiliados" icon={<Users className="h-4 w-4" />} label="Indicar" />
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <StatCard label="Total depositado" value={formatBRL(wallet.totalDeposited)} tone="positive" />
        <StatCard label="Total sacado" value={formatBRL(wallet.totalWithdrawn)} />
        <StatCard label="Ganhos afiliados" value={formatBRL(wallet.affiliateEarnings)} tone="positive" />
        <StatCard label="Indicações" value={String(wallet.referralsCount)} />
      </section>

      <section className="mt-6 glass rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Movimentações</p>
            <p className="mt-0.5 flex items-center gap-1 text-lg font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" /> {rangeLabel[range]}
            </p>
          </div>
        </div>
        <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                range === r ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground"
              }`}
            >
              {rangeLabel[r]}
            </button>
          ))}
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-glass-border)", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "var(--color-muted-foreground)" }}
                formatter={(v: number) => [formatBRL(v), "Valor"]}
              />
              <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fill="url(#fillPrimary)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Atividade recente</h2>
          <Link to="/extrato" className="text-xs text-primary">Ver todos</Link>
        </div>
        <div className="glass divide-y divide-white/5 rounded-2xl">
          {recent.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-primary">
                {t.type === "deposit" && <ArrowDownToLine className="h-4 w-4" />}
                {t.type === "withdraw" && <ArrowUpFromLine className="h-4 w-4" />}
                {t.type === "commission" && <Users className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{txLabel(t.type)}</p>
                <p className="truncate text-xs text-muted-foreground">{formatDate(t.createdAt)}</p>
              </div>
              <p className={`text-sm font-semibold ${t.type === "withdraw" ? "text-destructive" : "text-success"}`}>
                {t.type === "withdraw" ? "-" : "+"}
                {formatBRL(t.amount)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Link to="/admin" className="mt-6 flex items-center justify-between rounded-2xl border border-glass-border bg-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Painel administrativo</p>
            <p className="text-xs text-muted-foreground">Acesso restrito</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">Abrir →</span>
      </Link>
    </AppShell>
  );
}

function QuickAction({
  icon,
  label,
  to,
  tab,
}: {
  icon: React.ReactNode;
  label: string;
  to: "/pix" | "/afiliados";
  tab?: string;
}) {
  return (
    <Link
      to={to}
      search={tab ? { tab } : undefined}
      className="glass flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-medium transition-transform active:scale-95"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "positive" }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone === "positive" ? "text-success" : ""}`}>{value}</p>
    </div>
  );
}
