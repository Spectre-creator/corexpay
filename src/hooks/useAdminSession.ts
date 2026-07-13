import { useEffect, useState } from "react";
import { adminAuth } from "@/services/admin-auth.service";

export function useAdminSession() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(adminAuth.isAuthenticated());
  }, []);

  return {
    authed,
    login(email: string, password: string) {
      const ok = adminAuth.login(email, password);
      if (ok) setAuthed(true);
      return ok;
    },
    logout() {
      adminAuth.logout();
      setAuthed(false);
    },
  };
}
