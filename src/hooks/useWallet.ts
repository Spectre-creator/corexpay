import { useSyncExternalStore } from "react";
import { walletStore } from "@/services/wallet.service";
import type { Wallet } from "@/types";

/** Reage a mutações do saldo mockado. */
export function useWallet(): Wallet {
  useSyncExternalStore(walletStore.subscribe, walletStore.getVersion, walletStore.getVersion);
  return walletStore.get();
}
