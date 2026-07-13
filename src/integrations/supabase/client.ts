// Cliente Supabase para o CorePay.
// Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em um arquivo .env.local
// (veja .env.example). Enquanto não configurado, isSupabaseConfigured() retorna false
// e a UI cai automaticamente nos dados mock (src/lib/mock-data.ts).
//
// PORTABILIDADE PARA RAILWAY:
// Toda leitura/escrita passa por src/lib/api/*.ts. Ao migrar o backend para
// Node/NestJS no Railway, basta reescrever esses arquivos trocando o client
// Supabase por chamadas fetch à sua API REST — nenhuma tela precisa mudar.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database-types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = (): boolean => Boolean(url && anonKey);

// Tipado com `any` na camada API para não travar o build antes do typegen
// oficial (rodar `supabase gen types typescript` após conectar).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured()
  ? (createClient<Database>(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "corepay.auth",
      },
    }))
  : null;

// Handle sem tipagem de tabela, para as chamadas .from(...) da camada API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = supabase;
