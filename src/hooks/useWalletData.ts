import { useQuery } from "@tanstack/react-query";
import { getWallet } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useWallet as useMockWallet } from "@/hooks/useWallet";
import type { Wallet } from "@/types";

/**
 * Retorna a carteira atual.
 * - Se houver sessão Supabase: lê `wallets` do banco (reativo via React Query).
 * - Caso contrário: cai no store reativo mock (useWallet).
 */
export function useWalletData(): { wallet: Wallet; refetch: () => void; isLoading: boolean } {
  const mock = useMockWallet();
  const hasSession = useHasSession();

  const q = useQuery<Wallet>({
    queryKey: ["wallet"],
    queryFn: getWallet,
    enabled: hasSession,
    staleTime: 15_000,
  });

  if (!hasSession) return { wallet: mock, refetch: () => {}, isLoading: false };
  return {
    wallet: q.data ?? mock,
    refetch: () => q.refetch(),
    isLoading: q.isLoading,
  };
}

function useHasSession() {
  // Sync check via supabase client (session já carregada pelo useAuth root).
  if (!isSupabaseConfigured() || !supabase) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (supabase.auth as any).storage?.getItem?.("corepay.auth");
  // Fallback: consulta getSession sincronamente não existe — usamos hint pelo localStorage.
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem("corepay.auth") || raw);
  } catch {
    return false;
  }
}
