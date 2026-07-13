import { Badge } from "@/components/ui/badge";
import type { TxStatus } from "@/types";

type Variant = "default" | "admin";

const DEFAULT_MAP: Record<TxStatus, { label: string; cls: string }> = {
  completed: { label: "OK", cls: "bg-success/15 text-success" },
  pending: { label: "Pendente", cls: "bg-warning/15 text-warning" },
  failed: { label: "Falhou", cls: "bg-destructive/15 text-destructive" },
  expired: { label: "Expirado", cls: "bg-muted text-muted-foreground" },
};

const ADMIN_MAP: Record<TxStatus, { label: string; cls: string }> = {
  completed: { label: "Aprovado", cls: "bg-success/15 text-success" },
  pending: { label: "Pendente", cls: "bg-warning/15 text-warning" },
  failed: { label: "Rejeitado", cls: "bg-destructive/15 text-destructive" },
  expired: { label: "Expirado", cls: "bg-muted text-muted-foreground" },
};

export function StatusPill({ status, variant = "default" }: { status: TxStatus; variant?: Variant }) {
  const s = (variant === "admin" ? ADMIN_MAP : DEFAULT_MAP)[status];
  const padding = variant === "admin" ? "px-2" : "px-1.5";
  return (
    <Badge variant="outline" className={`rounded-full border-transparent ${padding} py-0 text-[9px] ${s.cls}`}>
      {s.label}
    </Badge>
  );
}
