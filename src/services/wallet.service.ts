// Store reativa do saldo mockado. Consumida pelo hook useWallet.
import type { Wallet } from "@/types";
import { initialWallet } from "./mock-data.service";

const state: Wallet = { ...initialWallet };

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

export const walletStore = {
  get: (): Wallet => state,
  getVersion: () => version,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  creditDeposit(amount: number) {
    state.balance = +(state.balance + amount).toFixed(2);
    state.totalDeposited = +(state.totalDeposited + amount).toFixed(2);
    emit();
  },
  debitWithdrawal(amount: number) {
    state.balance = +(state.balance - amount).toFixed(2);
    state.totalWithdrawn = +(state.totalWithdrawn + amount).toFixed(2);
    emit();
  },
};
