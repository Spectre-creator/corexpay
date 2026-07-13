import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

const PUBLIC_PREFIXES = ["/auth", "/admin", "/api"];

/**
 * Gate para rotas de usuário final.
 * - Dentro do Telegram: TelegramAutoLogin resolve; enquanto isso mostra spinner.
 * - Fora do Telegram e sem sessão: tela "Abra pelo Telegram" com fallback para /auth.
 * - Rotas admin/auth passam direto.
 * - Se Supabase não configurado: passa direto (modo mock).
 */
export function UserGate({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const isPublic = PUBLIC_PREFIXES.some((p) => loc.pathname.startsWith(p));
  const [state, setState] = useState<"loading" | "ok" | "blocked">("loading");

  useEffect(() => {
    if (isPublic || !isSupabaseConfigured() || !supabase) {
      setState("ok");
      return;
    }
    const sb = supabase;
    let disposed = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insideTelegram = Boolean((window as any).Telegram?.WebApp?.initData);

    async function check() {
      const { data } = await sb.auth.getSession();
      if (disposed) return;
      if (data.session) setState("ok");
      else if (insideTelegram) setState("loading"); // aguardando auto-login
      else setState("blocked");
    }
    check();

    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      if (disposed) return;
      if (s) setState("ok");
      else if (!insideTelegram) setState("blocked");
    });

    // Timeout para dentro do Telegram (se auto-login falhar)
    const t = insideTelegram
      ? window.setTimeout(() => { if (!disposed) setState((s) => (s === "loading" ? "blocked" : s)); }, 8000)
      : 0;

    return () => {
      disposed = true;
      sub.subscription.unsubscribe();
      if (t) window.clearTimeout(t);
    };
  }, [loc.pathname, isPublic]);

  if (isPublic || state === "ok") return <>{children}</>;

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Conectando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass-strong w-full max-w-sm rounded-3xl p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl gradient-brand text-primary-foreground">
          <MessageCircle className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold">Abra pelo Telegram</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este app funciona como Mini App dentro do Telegram. Acesse através do bot para entrar automaticamente.
        </p>
        <a
          href="https://t.me/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
        >
          Abrir Telegram
        </a>
        <Link to="/auth" className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground">
          Sou administrador — entrar com email
        </Link>
      </div>
    </div>
  );
}
