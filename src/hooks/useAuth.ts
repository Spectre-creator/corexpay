import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const sb = supabase;

    // Listener PRIMEIRO (evita perder eventos), depois getSession().
    const { data: sub } = sb.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
    });

    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) {
      setIsAdmin(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .rpc("has_role", { _user_id: session.user.id, _role: "admin" })
      .then(({ data }: { data: boolean | null }) => setIsAdmin(Boolean(data)));
  }, [session?.user?.id]);

  return { session, user: session?.user ?? null, loading, isAdmin };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
