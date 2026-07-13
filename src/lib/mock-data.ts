// Shim de compatibilidade — a fonte real agora está em:
//   src/services/mock-data.service.ts
//   src/services/wallet.service.ts
//   src/utils/format.ts
//   src/types/index.ts
// Mantido apenas para consumidores legados (ex.: src/lib/api/index.ts).
// Novos módulos devem importar diretamente das localizações canônicas.

export type {
  TxType,
  TxStatus,
  Transaction,
  CurrentUser,
  Wallet,
  Referral,
  AdminUser,
  AdminWithdrawal,
  PlatformSettings,
} from "@/types";

export {
  currentUser,
  transactions,
  referrals,
  platformSettings,
  adminUsers,
  adminWithdrawals,
  adminStats,
  adminChart,
  chartSeries,
} from "@/services/mock-data.service";

export { formatBRL, formatDate, txLabel } from "@/utils/format";
export { useWallet } from "@/hooks/useWallet";

import { walletStore } from "@/services/wallet.service";
import type { Wallet } from "@/types";

/** Snapshot mutável do saldo (compat legado). Use `useWallet()` em componentes. */
export const wallet: Wallet = walletStore.get();

export const creditDeposit = (amount: number) => walletStore.creditDeposit(amount);
export const debitWithdrawal = (amount: number) => walletStore.debitWithdrawal(amount);
