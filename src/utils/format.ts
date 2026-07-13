import type { TxType } from "@/types";

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Formata em UTC para evitar mismatch de SSR (servidor UTC vs cliente local).
export function formatDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dd}/${mm}, ${hh}:${mi}`;
}

const TX_LABEL: Record<TxType, string> = {
  deposit: "Depósito",
  withdraw: "Saque",
  commission: "Comissão",
};

export function txLabel(t: TxType) {
  return TX_LABEL[t];
}
