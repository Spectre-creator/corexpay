// Domínio central — tipos usados por services, hooks, pages e componentes.
// Fonte única da verdade para as entidades do CorePay.

export type TxType = "deposit" | "withdraw" | "commission";
export type TxStatus = "pending" | "completed" | "failed" | "expired";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  fee?: number;
  status: TxStatus;
  description: string;
  counterpart?: string;
  createdAt: string; // ISO
}

export interface CurrentUser {
  telegramId: number;
  username: string;
  firstName: string;
  photoUrl: string;
  memberSince: string;
  pinEnabled: boolean;
  affiliateCode: string;
}

export interface Wallet {
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  affiliateEarnings: number;
  referralsCount: number;
}

export interface Referral {
  id: string;
  username: string;
  joinedAt: string;
  earned: number;
  status: "active" | "inactive";
}

export interface AdminUser {
  id: string;
  telegramId: number;
  username: string;
  firstName: string;
  balance: number;
  totalDeposited: number;
  createdAt: string;
  blocked: boolean;
}

export interface AdminWithdrawal {
  id: string;
  user: string;
  pixKey: string;
  amount: number;
  fee: number;
  net: number;
  status: TxStatus;
  createdAt: string;
}

export interface PlatformSettings {
  withdrawFeePercent: number;
  minWithdraw: number;
  maxWithdraw: number;
  affiliateCommissionPercent: number;
}

export interface Prefs {
  notif: boolean;
  dark: boolean;
  privacy: boolean;
}

export type GatewayId = "fyhub" | "mercadopago" | "pagarme" | "efi" | "asaas";

export interface GatewayField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
}

export interface GatewayConfig {
  id: GatewayId;
  name: string;
  description: string;
  docsUrl: string;
  fields: GatewayField[];
}
