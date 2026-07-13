import { Link } from "@tanstack/react-router";
import { Home, ArrowLeftRight, Receipt, Users, UserCircle2 } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/pix", label: "PIX", icon: ArrowLeftRight, exact: false },
  { to: "/extrato", label: "Extrato", icon: Receipt, exact: false },
  { to: "/afiliados", label: "Afiliados", icon: Users, exact: false },
  { to: "/conta", label: "Conta", icon: UserCircle2, exact: false },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-3 pt-2"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="glass-strong flex items-center justify-between rounded-2xl px-2 py-2 shadow-[var(--shadow-card)]">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="group flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-muted-foreground transition-colors data-[status=active]:text-primary"
          >
            <Icon className="h-5 w-5 transition-transform group-data-[status=active]:scale-110" />
            <span className="text-[10px] font-medium tracking-wide">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
