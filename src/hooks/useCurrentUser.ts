import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, mockApi } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { CurrentUser } from "@/types";

export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      if (!isSupabaseConfigured() || !supabase) return mockApi.currentUser();
      const { data } = await supabase.auth.getSession();
      if (!data.session) return mockApi.currentUser();
      try {
        return await getCurrentUser();
      } catch {
        return mockApi.currentUser();
      }
    },
    staleTime: 60_000,
  });
}
