// Fonte de dados mockada (estática). Substituir por chamadas de rede quando
// o backend estiver disponível. Nenhum componente deve ler daqui diretamente:
// consumo via services/*, hooks/* ou pages/*.

import type {
  AdminUser,
  AdminWithdrawal,
  CurrentUser,
  PlatformSettings,
  Referral,
  Transaction,
  Wallet,
} from "@/types";

export const currentUser: CurrentUser = {
  telegramId: 782341190,
  username: "lucas_ferraz",
  firstName: "Lucas",
  photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Lucas",
  memberSince: "2025-03-14T12:00:00Z",
  pinEnabled: true,
  affiliateCode: "LUCAS42",
};

export const initialWallet: Wallet = {
  balance: 4287.9,
  totalDeposited: 18540.0,
  totalWithdrawn: 12110.5,
  affiliateEarnings: 634.2,
  referralsCount: 27,
};

export const platformSettings: PlatformSettings = {
  withdrawFeePercent: 2.5,
  minWithdraw: 20,
  maxWithdraw: 5000,
  affiliateCommissionPercent: 10,
};

// Ancora no início do dia UTC atual para manter SSR/CSR determinístico
// dentro do mesmo dia e para que filtros de período sempre encontrem dados.
const BASE_DATE = Math.floor(Date.now() / 86_400_000) * 86_400_000;
let __seed = 1;
const rand = () => {
  __seed = (__seed * 9301 + 49297) % 233280;
  return __seed / 233280;
};
const daysAgo = (n: number, h = 10) => {
  const d = new Date(BASE_DATE);
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(h, Math.floor(rand() * 59), 0, 0);
  return d.toISOString();
};

export const transactions: Transaction[] = [
  { id: "TX-10281", type: "deposit", amount: 500, status: "completed", description: "Depósito PIX", createdAt: daysAgo(0, 9) },
  { id: "TX-10280", type: "commission", amount: 12.4, status: "completed", description: "Comissão @maria_r", counterpart: "@maria_r", createdAt: daysAgo(0, 8) },
  { id: "TX-10279", type: "withdraw", amount: 300, fee: 7.5, status: "pending", description: "Saque PIX", createdAt: daysAgo(1, 14) },
  { id: "TX-10276", type: "deposit", amount: 1200, status: "completed", description: "Depósito PIX", createdAt: daysAgo(3, 10) },
  { id: "TX-10275", type: "commission", amount: 28.9, status: "completed", description: "Comissão @pedro.k", counterpart: "@pedro.k", createdAt: daysAgo(4, 15) },
  { id: "TX-10274", type: "withdraw", amount: 700, fee: 17.5, status: "completed", description: "Saque PIX", createdAt: daysAgo(6, 9) },
  { id: "TX-10273", type: "deposit", amount: 250, status: "expired", description: "Depósito PIX expirado", createdAt: daysAgo(7, 20) },
  { id: "TX-10272", type: "commission", amount: 6.2, status: "pending", description: "Comissão @luisa.a", counterpart: "@luisa.a", createdAt: daysAgo(9, 13) },
  { id: "TX-10271", type: "deposit", amount: 980, status: "completed", description: "Depósito PIX", createdAt: daysAgo(12, 11) },
  { id: "TX-10270", type: "withdraw", amount: 1500, fee: 37.5, status: "completed", description: "Saque PIX", createdAt: daysAgo(14, 17) },
  { id: "TX-10268", type: "commission", amount: 42.5, status: "completed", description: "Comissão @rafa.dev", counterpart: "@rafa.dev", createdAt: daysAgo(22, 9) },
  { id: "TX-10267", type: "deposit", amount: 2000, status: "completed", description: "Depósito PIX", createdAt: daysAgo(27, 10) },
];

export const chartSeries = {
  today: [
    { label: "00h", value: 120 },
    { label: "04h", value: 90 },
    { label: "08h", value: 260 },
    { label: "12h", value: 410 },
    { label: "16h", value: 320 },
    { label: "20h", value: 500 },
  ],
  "7d": [
    { label: "Seg", value: 320 },
    { label: "Ter", value: 480 },
    { label: "Qua", value: 250 },
    { label: "Qui", value: 610 },
    { label: "Sex", value: 720 },
    { label: "Sáb", value: 540 },
    { label: "Dom", value: 460 },
  ],
  "15d": Array.from({ length: 15 }, (_, i) => ({
    label: `${i + 1}`,
    value: Math.round(200 + rand() * 800),
  })),
  "30d": Array.from({ length: 30 }, (_, i) => ({
    label: `${i + 1}`,
    value: Math.round(150 + rand() * 900),
  })),
  total: Array.from({ length: 12 }, (_, i) => ({
    label: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][i],
    value: Math.round(1500 + rand() * 6000),
  })),
};

export const referrals: Referral[] = [
  { id: "r1", username: "@maria_r", joinedAt: daysAgo(3), earned: 82.4, status: "active" },
  { id: "r2", username: "@pedro.k", joinedAt: daysAgo(9), earned: 156.9, status: "active" },
  { id: "r3", username: "@luisa.a", joinedAt: daysAgo(14), earned: 42.1, status: "active" },
  { id: "r4", username: "@joao88", joinedAt: daysAgo(20), earned: 0, status: "inactive" },
  { id: "r5", username: "@rafa.dev", joinedAt: daysAgo(28), earned: 210.5, status: "active" },
  { id: "r6", username: "@bia_ss", joinedAt: daysAgo(41), earned: 18.6, status: "inactive" },
];

export const adminUsers: AdminUser[] = [
  { id: "u1", telegramId: 782341190, username: "lucas_ferraz", firstName: "Lucas", balance: 4287.9, totalDeposited: 18540, createdAt: daysAgo(120), blocked: false },
  { id: "u2", telegramId: 918273645, username: "maria_r", firstName: "Maria", balance: 820.3, totalDeposited: 3200, createdAt: daysAgo(60), blocked: false },
  { id: "u3", telegramId: 554433221, username: "pedro.k", firstName: "Pedro", balance: 1540.0, totalDeposited: 7800, createdAt: daysAgo(40), blocked: false },
  { id: "u4", telegramId: 665544332, username: "joao88", firstName: "João", balance: 12.5, totalDeposited: 500, createdAt: daysAgo(22), blocked: true },
  { id: "u5", telegramId: 112233445, username: "rafa.dev", firstName: "Rafael", balance: 3210.0, totalDeposited: 9800, createdAt: daysAgo(75), blocked: false },
  { id: "u6", telegramId: 998877665, username: "bia_ss", firstName: "Bianca", balance: 46.2, totalDeposited: 200, createdAt: daysAgo(15), blocked: false },
];

export const adminWithdrawals: AdminWithdrawal[] = [
  { id: "W-8842", user: "@lucas_ferraz", pixKey: "lucas@corepay.io", amount: 300, fee: 7.5, net: 292.5, status: "pending", createdAt: daysAgo(0, 14) },
  { id: "W-8841", user: "@maria_r", pixKey: "+55 11 99887-2211", amount: 500, fee: 12.5, net: 487.5, status: "pending", createdAt: daysAgo(0, 10) },
  { id: "W-8840", user: "@pedro.k", pixKey: "123.456.789-00", amount: 1200, fee: 30, net: 1170, status: "completed", createdAt: daysAgo(1, 16) },
  { id: "W-8839", user: "@rafa.dev", pixKey: "rafa.dev@pix.br", amount: 800, fee: 20, net: 780, status: "completed", createdAt: daysAgo(2, 12) },
  { id: "W-8838", user: "@bia_ss", pixKey: "bia@corepay.io", amount: 60, fee: 1.5, net: 58.5, status: "failed", createdAt: daysAgo(3, 9) },
];

export const adminStats = {
  totalUsers: 1284,
  circulatingBalance: 218432.55,
  depositsToday: 12480.0,
  withdrawalsToday: 8730.0,
  revenueToday: 412.7,
  revenueMonth: 9812.4,
};

export const adminChart = Array.from({ length: 14 }, (_, i) => ({
  label: `${i + 1}`,
  depositos: Math.round(3000 + rand() * 4000),
  saques: Math.round(2000 + rand() * 3500),
}));
