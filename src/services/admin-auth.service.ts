// Autenticação demo do painel administrativo.
// Substituir por chamada ao backend quando disponível.
const ADMIN_EMAIL = "admin@corepay.io";
const ADMIN_PASSWORD = "corepay2026";
const SESSION_KEY = "corepay:admin-session";

export const adminAuth = {
  demoEmail: ADMIN_EMAIL,
  demoPassword: ADMIN_PASSWORD,
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  },
  login(email: string, password: string): boolean {
    if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) return false;
    if (typeof window !== "undefined") window.sessionStorage.setItem(SESSION_KEY, "1");
    return true;
  },
  logout() {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(SESSION_KEY);
  },
};
