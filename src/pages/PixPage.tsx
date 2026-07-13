import { useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Copy, Check, QrCode, Loader2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/hooks/useWallet";
import { mockApi, walletApi } from "@/lib/api";
import { formatBRL } from "@/utils/format";

export function PixPage({ initialTab }: { initialTab: "deposit" | "withdraw" }) {
  const w = useWallet();
  const platformSettings = mockApi.platformSettings();

  return (
    <AppShell>
      <PageHeader title="PIX" subtitle="Movimente seu dinheiro em segundos" />
      <div className="glass mb-4 flex items-center justify-between rounded-2xl px-4 py-3">
        <span className="text-xs text-muted-foreground">Saldo</span>
        <span className="text-sm font-semibold">{formatBRL(w.balance)}</span>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white/5 p-1">
          <TabsTrigger value="deposit" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Depositar
          </TabsTrigger>
          <TabsTrigger value="withdraw" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Sacar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposit" className="mt-4"><DepositTab /></TabsContent>
        <TabsContent value="withdraw" className="mt-4"><WithdrawTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

type DepositState = { status: "pending" | "paid" | "expired"; amount: number; code: string } | null;

function DepositTab() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [deposit, setDeposit] = useState<DepositState>(null);
  const [copied, setCopied] = useState(false);

  const value = Number(amount.replace(",", "."));

  async function generatePix() {
    if (!value || value < 5) return toast.error("Valor mínimo: R$ 5,00");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setDeposit({
      status: "pending",
      amount: value,
      code: "00020126360014BR.GOV.BCB.PIX0114+5511998877665204000053039865802BR5920CorePay Pagamentos6009SAO PAULO62070503***6304C0A1",
    });
    setLoading(false);
  }

  function simulatePayment() {
    if (!deposit || deposit.status !== "pending") return;
    walletApi.credit(deposit.amount);
    setDeposit({ ...deposit, status: "paid" });
    toast.success("Pagamento confirmado! Saldo creditado.");
  }

  function copy() {
    if (!deposit) return;
    navigator.clipboard.writeText(deposit.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (deposit) {
    return (
      <div className="glass rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Depósito PIX</p>
            <p className="text-2xl font-bold">{formatBRL(deposit.amount)}</p>
          </div>
          <StatusBadge status={deposit.status} />
        </div>

        <div className="mx-auto grid aspect-square w-52 place-items-center rounded-2xl bg-white p-3">
          <div
            className="h-full w-full rounded-lg"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, #0f172a 0 6px, transparent 6px 12px),
                repeating-linear-gradient(90deg, #0f172a 0 6px, transparent 6px 12px)
              `,
              backgroundSize: "12px 12px",
            }}
          />
        </div>

        <div className="mt-4 rounded-xl bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Copia e cola</p>
          <p className="mt-1 break-all font-mono text-xs">{deposit.code.slice(0, 90)}…</p>
          <Button onClick={copy} variant="secondary" className="mt-3 w-full rounded-xl">
            {copied ? <><Check className="mr-2 h-4 w-4" /> Copiado</> : <><Copy className="mr-2 h-4 w-4" /> Copiar código</>}
          </Button>
        </div>

        <div className="mt-4 flex gap-2">
          {deposit.status === "pending" && (
            <Button onClick={simulatePayment} className="flex-1 rounded-xl">Simular pagamento</Button>
          )}
          <Button variant="outline" onClick={() => setDeposit(null)} className="flex-1 rounded-xl">Novo depósito</Button>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">Aguardando confirmação do provedor PIX</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-5">
      <Label className="text-xs text-muted-foreground">Valor do depósito</Label>
      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3">
        <span className="text-lg text-muted-foreground">R$</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ""))}
          placeholder="0,00"
          inputMode="decimal"
          className="w-full bg-transparent text-2xl font-semibold outline-none"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[50, 100, 250, 500, 1000].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(String(v))}
            className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {formatBRL(v)}
          </button>
        ))}
      </div>
      <Button onClick={generatePix} disabled={loading} className="mt-6 w-full rounded-2xl py-6 text-base">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-5 w-5" />}
        Gerar PIX
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        <ArrowDownToLine className="mr-1 inline h-3 w-3" />
        Sem taxa de depósito
      </p>
    </div>
  );
}

function WithdrawTab() {
  const w = useWallet();
  const platformSettings = mockApi.platformSettings();
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState("cpf");
  const [amount, setAmount] = useState("");

  const value = Number(amount.replace(",", "."));
  const fee = +(value * (platformSettings.withdrawFeePercent / 100)).toFixed(2);
  const net = +(value - fee).toFixed(2);

  function submit() {
    if (!pixKey) return toast.error("Informe a chave PIX");
    if (!value) return toast.error("Informe o valor");
    if (value < platformSettings.minWithdraw) return toast.error(`Mínimo: ${formatBRL(platformSettings.minWithdraw)}`);
    if (value > platformSettings.maxWithdraw) return toast.error(`Máximo: ${formatBRL(platformSettings.maxWithdraw)}`);
    if (value > w.balance) return toast.error("Saldo insuficiente");
    walletApi.debit(value);
    toast.success("Solicitação de saque enviada. Acompanhe no extrato.");
    setAmount("");
    setPixKey("");
  }

  return (
    <div className="glass space-y-4 rounded-3xl p-5">
      <div>
        <Label className="text-xs text-muted-foreground">Tipo de chave</Label>
        <Select value={pixType} onValueChange={setPixType}>
          <SelectTrigger className="mt-2 rounded-xl bg-white/5"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cpf">CPF</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="phone">Telefone</SelectItem>
            <SelectItem value="random">Chave aleatória</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Chave PIX</Label>
        <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Digite a chave" className="mt-2 rounded-xl bg-white/5" />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Valor do saque</Label>
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
          <span className="text-muted-foreground">R$</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ""))}
            placeholder="0,00"
            inputMode="decimal"
            className="w-full bg-transparent text-xl font-semibold outline-none"
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Mín. {formatBRL(platformSettings.minWithdraw)} · Máx. {formatBRL(platformSettings.maxWithdraw)}
        </p>
      </div>

      <div className="rounded-xl bg-white/5 p-3 text-sm">
        <Row label="Valor" value={value ? formatBRL(value) : "—"} />
        <Row label={`Taxa (${platformSettings.withdrawFeePercent}%)`} value={value ? `- ${formatBRL(fee)}` : "—"} />
        <div className="my-2 h-px bg-white/10" />
        <Row label="Você recebe" value={value ? formatBRL(net) : "—"} strong />
      </div>

      <Button onClick={submit} className="w-full rounded-2xl py-6 text-base">
        <ArrowUpFromLine className="mr-2 h-5 w-5" /> Solicitar saque
      </Button>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={strong ? "text-base font-semibold" : "text-sm"}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "paid" | "expired" | "completed" | "failed" }) {
  const map = {
    pending: { label: "Pendente", cls: "bg-warning/20 text-warning border-warning/30" },
    paid: { label: "Pago", cls: "bg-success/20 text-success border-success/30" },
    completed: { label: "Concluído", cls: "bg-success/20 text-success border-success/30" },
    expired: { label: "Expirado", cls: "bg-destructive/20 text-destructive border-destructive/30" },
    failed: { label: "Falhou", cls: "bg-destructive/20 text-destructive border-destructive/30" },
  } as const;
  const s = map[status];
  return <Badge variant="outline" className={`rounded-full ${s.cls}`}>{s.label}</Badge>;
}
