import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Share2, Users, TrendingUp, Wallet, Clock } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/hooks/useWallet";
import { mockApi } from "@/lib/api";
import { formatBRL, formatDate } from "@/utils/format";

export function AfiliadosPage() {
  const wallet = useWallet();
  const currentUser = mockApi.currentUser();
  const referrals = mockApi.referrals();
  const platformSettings = mockApi.platformSettings();
  const link = `https://t.me/corepay_bot?start=${currentUser.affiliateCode}`;
  const [copied, setCopied] = useState(false);

  const totalReferrals = referrals.length;
  const earned = wallet.affiliateEarnings;
  const pending = referrals.reduce((s, r) => s + r.earned * 0.3, 0);

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AppShell>
      <PageHeader
        title="Afiliados"
        subtitle={`Ganhe ${platformSettings.affiliateCommissionPercent}% das taxas de quem você indicar`}
      />

      <section className="gradient-brand relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-[var(--shadow-glow)]">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        <p className="text-xs uppercase tracking-wider opacity-80">Seu link exclusivo</p>
        <p className="mt-2 break-all font-mono text-sm">{link}</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={copy} variant="secondary" className="flex-1 rounded-xl bg-white/20 text-primary-foreground hover:bg-white/30">
            {copied ? <><Check className="mr-2 h-4 w-4" />Copiado</> : <><Copy className="mr-2 h-4 w-4" />Copiar</>}
          </Button>
          <Button
            variant="secondary"
            className="flex-1 rounded-xl bg-white/20 text-primary-foreground hover:bg-white/30"
            onClick={() => {
              if (navigator.share) navigator.share({ url: link, title: "Entre na CorePay" });
              else copy();
            }}
          >
            <Share2 className="mr-2 h-4 w-4" /> Compartilhar
          </Button>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Metric icon={<Users className="h-4 w-4" />} label="Indicados" value={String(totalReferrals)} />
        <Metric icon={<TrendingUp className="h-4 w-4" />} label="Ganhos totais" value={formatBRL(earned + pending)} />
        <Metric icon={<Wallet className="h-4 w-4" />} label="Pagos" value={formatBRL(earned)} tone="positive" />
        <Metric icon={<Clock className="h-4 w-4" />} label="Pendentes" value={formatBRL(pending)} tone="warning" />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Seus indicados</h2>
        <div className="glass divide-y divide-white/5 rounded-2xl">
          {referrals.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
                {r.username.slice(1, 3).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.username}</p>
                <p className="text-[11px] text-muted-foreground">Desde {formatDate(r.joinedAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-success">{formatBRL(r.earned)}</p>
                <Badge
                  variant="outline"
                  className={`rounded-full border-transparent px-1.5 py-0 text-[9px] ${
                    r.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "positive" | "warning" }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`mt-1 text-lg font-semibold ${tone === "positive" ? "text-success" : tone === "warning" ? "text-warning" : ""}`}>{value}</p>
    </div>
  );
}
