import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { PrefsProvider } from "@/contexts/PrefsContext";
import { TelegramAutoLogin } from "@/components/TelegramAutoLogin";
import { UserGate } from "@/components/UserGate";
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass max-w-sm rounded-3xl p-8 text-center">
        <h1 className="text-6xl font-bold text-gradient">404</h1>
        <h2 className="mt-3 text-lg font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O caminho que você tentou acessar não existe.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass max-w-sm rounded-3xl p-8 text-center">
        <h1 className="text-lg font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente novamente. Se persistir, volte para a home.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tentar novamente
          </button>
          <a href="/" className="rounded-xl border border-border px-4 py-2 text-sm">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0f2b33" },
      { title: "CorePay — Carteira Digital PIX no Telegram" },
      { name: "description", content: "Carteira digital PIX dentro do Telegram: deposite, saque e ganhe com o programa de afiliados. Rápido, seguro e sem burocracia." },
      { property: "og:site_name", content: "CorePay" },
      { property: "og:title", content: "CorePay — Carteira Digital PIX no Telegram" },
      { property: "og:description", content: "Sua carteira PIX dentro do Telegram. Depósitos e saques instantâneos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "CorePay — Carteira Digital" },
      { name: "twitter:description", content: "Sua carteira PIX dentro do Telegram." },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    scripts: [
      { src: "https://telegram.org/js/telegram-web-app.js", async: true },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useTelegramWebApp();
  return (
    <QueryClientProvider client={queryClient}>
      <PrefsProvider>
        <TelegramAutoLogin />
        <UserGate>
          <Outlet />
        </UserGate>
        <Toaster position="top-center" theme="dark" />
      </PrefsProvider>
    </QueryClientProvider>
  );
}
