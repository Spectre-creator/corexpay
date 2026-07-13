import { useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TG = any;

/**
 * Inicializa o Telegram WebApp SDK quando disponível:
 * - chama ready() e expand() para ocupar tela inteira
 * - aplica themeParams como CSS vars (--tg-*)
 * - habilita closing confirmation
 * - re-aplica tema em themeChanged
 *
 * Seguro fora do Telegram (SDK ausente = no-op).
 */
export function useTelegramWebApp() {
  useEffect(() => {
    let cancelled = false;

    const tryInit = (attempt = 0) => {
      if (cancelled) return;
      const tg: TG = (window as unknown as { Telegram?: { WebApp?: TG } }).Telegram?.WebApp;
      if (!tg) {
        if (attempt < 20) setTimeout(() => tryInit(attempt + 1), 100);
        return;
      }

      try {
        tg.ready?.();
        tg.expand?.();
        tg.enableClosingConfirmation?.();
        if (tg.setHeaderColor) tg.setHeaderColor("secondary_bg_color");
      } catch {
        /* noop */
      }

      const applyTheme = () => {
        const p = tg.themeParams ?? {};
        const root = document.documentElement;
        const set = (k: string, v?: string) => {
          if (v) root.style.setProperty(k, v);
        };
        set("--tg-bg", p.bg_color);
        set("--tg-text", p.text_color);
        set("--tg-hint", p.hint_color);
        set("--tg-link", p.link_color);
        set("--tg-button", p.button_color);
        set("--tg-button-text", p.button_text_color);
        set("--tg-secondary-bg", p.secondary_bg_color);
      };

      applyTheme();
      tg.onEvent?.("themeChanged", applyTheme);
    };

    tryInit();
    return () => {
      cancelled = true;
    };
  }, []);
}
