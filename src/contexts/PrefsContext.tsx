import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultPrefs, prefsService } from "@/services/prefs.service";
import type { Prefs } from "@/types";

interface PrefsContextValue {
  prefs: Prefs;
  updatePref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);

  // Hidrata do storage no cliente para manter SSR determinístico.
  useEffect(() => {
    setPrefs(prefsService.read());
  }, []);

  // Persiste + aplica tema escuro no <html>.
  useEffect(() => {
    if (typeof window === "undefined") return;
    prefsService.write(prefs);
    document.documentElement.classList.toggle("dark", prefs.dark);
  }, [prefs]);

  const updatePref: PrefsContextValue["updatePref"] = (key, value) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  return <PrefsContext.Provider value={{ prefs, updatePref }}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs deve ser usado dentro de <PrefsProvider>");
  return ctx;
}
