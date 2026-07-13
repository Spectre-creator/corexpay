import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Users, Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/shared/StatusPill";
import { useTransactions } from "@/hooks/useTransactions";
import { formatBRL, formatDate, txLabel } from "@/utils/format";
import type { Transaction, TxType } from "@/types";

const filters = ["all", "deposit", "withdraw", "commission"] as const;
const filterLabel: Record<(typeof filters)[number], string> = {
  all: "Todos",
  deposit: "Depósitos",
  withdraw: "Saques",
  commission: "Comissões",
};

const periods = ["today", "7d", "15d", "30d"] as const;
const periodLabel = { today: "Hoje", "7d": "7 dias", "15d": "15 dias", "30d": "30 dias" } as const;

function matchesFilter(t: Transaction, f: (typeof filters)[number]) {
  if (f === "all") return true;
  return t.type === (f as TxType);
}

function matchesPeriod(t: Transaction, p: (typeof periods)[number]) {
  const days = { today: 0, "7d": 7, "15d": 15, "30d": 30 }[p];
  const diff = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (p === "today") return diff < 1;
  return diff <= days;
}

export function ExtratoPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [period, setPeriod] = useState<(typeof periods)[number]>("30d");
  const [query, setQuery] = useState("");
  const { data: transactions = [] } = useTransactions();

  const filtered = useMemo(
    () =>
      transactions
        .filter((t) => matchesFilter(t, filter))
        .filter((t) => matchesPeriod(t, period))
        .filter((t) =>
          query
            ? (t.description + t.id + (t.counterpart ?? "")).toLowerCase().includes(query.toLowerCase())
            : true,
        ),
    [filter, period, query, transactions],
  );

  const totals = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const t of filtered) {
      if (t.type === "withdraw") outflow += t.amount;
      else inflow += t.amount;
    }
    return { inflow, outflow };
  }, [filtered]);

  return (
    <AppShell>
      <PageHeader title="Extrato" subtitle="Suas movimentações" />

      <div className="glass mb-4 grid grid-cols-2 gap-3 rounded-2xl p-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Entradas</p>
          <p className="mt-1 text-lg font-semibold text-success">{formatBRL(totals.inflow)}</p>
        </div>
        <div className="border-l border-white/10 pl-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saídas</p>
          <p className="mt-1 text-lg font-semibold text-destructive">{formatBRL(totals.outflow)}</p>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por ID, descrição ou usuário"
          className="rounded-xl bg-white/5 pl-9"
        />
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground"
            }`}
          >
            {filterLabel[f]}
          </button>
        ))}
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] ${
              period === p ? "border border-primary/40 text-primary" : "border border-white/10 text-muted-foreground"
            }`}
          >
            {periodLabel[p]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhuma movimentação encontrada.
        </div>
      ) : (
        <div className="glass divide-y divide-white/5 rounded-2xl">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${iconBg(t.type)}`}>
                {iconFor(t.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{txLabel(t.type)}</p>
                  <StatusPill status={t.status} />
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {t.counterpart ? `${t.counterpart} · ` : ""}
                  {formatDate(t.createdAt)} · {t.id}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${t.type === "withdraw" ? "text-destructive" : "text-success"}`}>
                  {t.type === "withdraw" ? "-" : "+"}
                  {formatBRL(t.amount)}
                </p>
                {t.fee ? <p className="text-[10px] text-muted-foreground">taxa {formatBRL(t.fee)}</p> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function iconFor(t: TxType) {
  const cls = "h-4 w-4";
  if (t === "deposit") return <ArrowDownToLine className={cls} />;
  if (t === "withdraw") return <ArrowUpFromLine className={cls} />;
  return <Users className={cls} />;
}
function iconBg(t: TxType) {
  if (t === "deposit" || t === "commission") return "bg-success/15 text-success";
  return "bg-destructive/15 text-destructive";
}
