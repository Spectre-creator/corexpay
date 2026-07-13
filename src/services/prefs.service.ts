import type { Prefs } from "@/types";

const KEY = "corepay:prefs";
export const defaultPrefs: Prefs = { notif: true, dark: true, privacy: false };

export const prefsService = {
  read(): Prefs {
    if (typeof window === "undefined") return defaultPrefs;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return defaultPrefs;
      return { ...defaultPrefs, ...(JSON.parse(raw) as Partial<Prefs>) };
    } catch {
      return defaultPrefs;
    }
  },
  write(prefs: Prefs) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  },
};
