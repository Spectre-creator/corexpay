import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Bell,
  Fingerprint,
  KeyRound,
  LogOut,
  Moon,
  Shield,
  ShieldCheck,
  User as UserIcon,
  ChevronRight,
  Copy,
  Eye,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { usePrefs } from "@/contexts/PrefsContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { mockApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/utils/format";

export function ContaPage() {
  const { prefs, updatePref } = usePrefs();
  const { data } = useCurrentUser();
  const currentUser = data ?? mockApi.currentUser();
  const navigate = useNavigate();

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth" });
  }

  return (
    <AppShell>
      <PageHeader title="Conta" subtitle="Perfil e configurações" />

      <section className="glass flex items-center gap-4 rounded-3xl p-4">
        <img src={currentUser.photoUrl} alt={currentUser.firstName} className="h-16 w-16 rounded-2xl ring-2 ring-primary/40" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{currentUser.firstName}</p>
          <p className="truncate text-sm text-muted-foreground">@{currentUser.username}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Membro desde {formatDate(currentUser.memberSince)}</p>
        </div>
      </section>

      <section className="mt-4 glass rounded-2xl">
        <InfoRow
          icon={<UserIcon className="h-4 w-4" />}
          label="Telegram ID"
          value={String(currentUser.telegramId)}
          action={
            <button
              onClick={() => {
                navigator.clipboard.writeText(String(currentUser.telegramId));
                toast.success("ID copiado");
              }}
              className="text-muted-foreground"
            >
              <Copy className="h-4 w-4" />
            </button>
          }
        />
        <Divider />
        <InfoRow icon={<Shield className="h-4 w-4" />} label="Código de afiliado" value={currentUser.affiliateCode} />
      </section>

      <SectionTitle>Preferências</SectionTitle>
      <section className="glass rounded-2xl">
        <ToggleRow icon={<Bell className="h-4 w-4" />} label="Notificações" checked={prefs.notif} onChange={(v) => updatePref("notif", v)} />
        <Divider />
        <ToggleRow icon={<Moon className="h-4 w-4" />} label="Tema escuro" checked={prefs.dark} onChange={(v) => updatePref("dark", v)} />
        <Divider />
        <ToggleRow icon={<Eye className="h-4 w-4" />} label="Perfil privado" checked={prefs.privacy} onChange={(v) => updatePref("privacy", v)} />
      </section>

      <SectionTitle>Segurança</SectionTitle>
      <section className="glass rounded-2xl">
        <ActionRow icon={<KeyRound className="h-4 w-4" />} label="PIN de 6 dígitos" hint={currentUser.pinEnabled ? "Ativado" : "Desativado"} onClick={() => toast.info("Configuração de PIN em breve")} />
        <Divider />
        <ActionRow icon={<Fingerprint className="h-4 w-4" />} label="Confirmação em saques" hint="Exigir PIN" onClick={() => toast.info("Configuração em breve")} />
        <Divider />
        <ActionRow icon={<ShieldCheck className="h-4 w-4" />} label="Histórico de login" hint="Ver dispositivos e IPs" onClick={() => toast.info("Histórico em breve")} />
      </section>

      <SectionTitle>Administração</SectionTitle>
      <Link to="/admin" className="glass flex items-center justify-between rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Painel do administrador</p>
            <p className="text-xs text-muted-foreground">Acesso restrito</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <button
        onClick={handleSignOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sair
      </button>

      <p className="mt-6 text-center text-[10px] text-muted-foreground">CorePay v1.0.0 · Telegram Mini App</p>
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}
function Divider() {
  return <div className="mx-4 h-px bg-white/5" />;
}
function InfoRow({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      {action}
    </div>
  );
}
function ToggleRow({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-muted-foreground">{icon}</div>
      <p className="flex-1 text-sm font-medium">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
function ActionRow({ icon, label, hint, onClick }: { icon: React.ReactNode; label: string; hint: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white/5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
