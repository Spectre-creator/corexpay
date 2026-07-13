import { useQuery } from "@tanstack/react-query";
import { listTransactions, mockApi } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { Transaction } from "@/types";

export function useTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      if (!isSupabaseConfigured() || !supabase) return mockApi.transactions();
      const { data } = await supabase.auth.getSession();
      if (!data.session) return mockApi.transactions();
      try {
        const rows = await listTransactions();
        return rows.length ? rows : mockApi.transactions();
      } catch {
        return mockApi.transactions();
      }
    },
    staleTime: 15_000,
  });
}
