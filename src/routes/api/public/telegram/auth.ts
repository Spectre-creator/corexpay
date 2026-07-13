// Server route: valida o initData do Telegram Mini App via HMAC-SHA256
// e devolve tokens de sessão do Supabase (access + refresh).
//
// Fluxo:
//   1. Client envia { initData } coletado de window.Telegram.WebApp.initData
//   2. Servidor recalcula o hash usando TELEGRAM_BOT_TOKEN (secret) e compara
//   3. Se válido: upsert em auth.users via service_role usando email sintético
//      tg_<telegram_id>@corepay.local, gera magic link, extrai tokens.
//   4. Client chama supabase.auth.setSession(tokens) → sessão real, RLS ativa.
//
// Bot token: primeiro lê secret TELEGRAM_BOT_TOKEN; se ausente, cai para
// app_settings.key='telegram_bot_token' (configurado pelo admin no painel).

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

function parseInitData(initData: string): { params: URLSearchParams; user: TgUser | null; hash: string } {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash") ?? "";
  const userRaw = params.get("user");
  let user: TgUser | null = null;
  if (userRaw) {
    try { user = JSON.parse(userRaw) as TgUser; } catch { /* noop */ }
  }
  return { params, user, hash };
}

function verifyInitData(initData: string, botToken: string): boolean {
  const { params, hash } = parseInitData(initData);
  if (!hash) return false;
  params.delete("hash");
  const dataCheck = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secret).update(dataCheck).digest("hex");
  return computed === hash;
}

function checkFreshness(initData: string, maxAgeSec = 86400): boolean {
  const authDate = Number(new URLSearchParams(initData).get("auth_date") ?? 0);
  if (!authDate) return false;
  return Math.abs(Date.now() / 1000 - authDate) < maxAgeSec;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveBotToken(admin: any): Promise<string | null> {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (envToken) return envToken;
  const { data } = await admin.from("app_settings").select("value").eq("key", "telegram_bot_token").maybeSingle();
  return (data?.value as string | undefined) ?? null;
}

export const Route = createFileRoute("/api/public/telegram/auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const serviceKey = process.env.SB_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !serviceKey) {
          return Response.json({ error: "Server missing Supabase credentials" }, { status: 500 });
        }

        let body: { initData?: string };
        try { body = await request.json(); } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const initData = body.initData;
        if (!initData || typeof initData !== "string") {
          return Response.json({ error: "Missing initData" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin: any = createClient(SUPABASE_URL, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const botToken = await resolveBotToken(admin);
        if (!botToken) {
          return Response.json({ error: "Bot token not configured. Configure em Admin → Integrações." }, { status: 503 });
        }

        if (!verifyInitData(initData, botToken)) {
          return Response.json({ error: "Invalid initData signature" }, { status: 401 });
        }
        if (!checkFreshness(initData)) {
          return Response.json({ error: "initData expired" }, { status: 401 });
        }

        const { user: tgUser } = parseInitData(initData);
        if (!tgUser?.id) {
          return Response.json({ error: "Missing telegram user" }, { status: 400 });
        }

        const email = `tg_${tgUser.id}@corepay.local`;
        const metadata = {
          telegram_id: String(tgUser.id),
          username: tgUser.username ?? "",
          first_name: tgUser.first_name ?? "",
          photo_url: tgUser.photo_url ?? "",
        };

        // Upsert: cria se não existir (idempotente).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: createRes, error: createErr } = await (admin.auth.admin as any).createUser({
          email,
          email_confirm: true,
          user_metadata: metadata,
        });

        // Se já existe, seguimos para gerar magic link — não é erro.
        if (createErr && !/registered|exists/i.test(createErr.message)) {
          return Response.json({ error: createErr.message }, { status: 500 });
        }
        void createRes;

        // Gera magic link e extrai tokens (não envia email).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: linkData, error: linkErr } = await (admin.auth.admin as any).generateLink({
          type: "magiclink",
          email,
        });
        if (linkErr) {
          return Response.json({ error: linkErr.message }, { status: 500 });
        }
        const props = linkData?.properties;
        const hashed = props?.hashed_token;
        if (!hashed) {
          return Response.json({ error: "No token generated" }, { status: 500 });
        }

        // Verifica o token → sessão utilizável.
        const anon = createClient(SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY as string, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: verifyData, error: verifyErr } = await anon.auth.verifyOtp({
          type: "magiclink",
          token_hash: hashed,
        });
        if (verifyErr || !verifyData.session) {
          return Response.json({ error: verifyErr?.message ?? "Verify failed" }, { status: 500 });
        }

        return Response.json({
          access_token: verifyData.session.access_token,
          refresh_token: verifyData.session.refresh_token,
          user: verifyData.user,
        });
      },
    },
  },
});
