import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Roda uma vez ao montar. Se estiver dentro do Telegram Mini App
// (window.Telegram.WebApp.initData presente) e não houver sessão ativa,
// troca o initData por uma sessão real do Supabase.
export function TelegramAutoLogin() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !supabase) return;
    ran.current = true;

    const sb = supabase;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tg = (window as any).Telegram?.WebApp;
      const initData: string | undefined = tg?.initData;
      if (!initData) return; // fora do Telegram → deixa /auth cuidar

      try { tg.ready?.(); tg.expand?.(); } catch { /* noop */ }

      const { data: existing } = await sb.auth.getSession();
      if (existing.session) return; // já logado

      try {
        const res = await fetch("/api/public/telegram/auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        if (!res.ok) {
          console.warn("[telegram-auth]", res.status, await res.text());
          return;
        }
        const json = (await res.json()) as { access_token: string; refresh_token: string };
        await sb.auth.setSession({
          access_token: json.access_token,
          refresh_token: json.refresh_token,
        });
      } catch (err) {
        console.warn("[telegram-auth]", err);
      }
    })();
  }, []);

  return null;
}
