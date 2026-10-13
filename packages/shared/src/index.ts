export interface WalletView {
  userId: string;
  network: "solana-devnet";
  address: string;
  createdAt: string;
}
export interface BalanceView {
  network: "solana-devnet";
  address: string;
  balanceLamports: string;
  balanceSol: string;
  observedAt: string;
  source: "on-chain";
}
export interface TransactionView {
  signature: string;
  slot: number;
  status: "confirmed" | "failed";
  blockTime: number | null;
}
export function lamportsToSol(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const n = value < 0n ? -value : value;
  return `${sign}${n / 1_000_000_000n}.${(n % 1_000_000_000n).toString().padStart(9, "0")}`;
}
export function solToLamports(value: string): bigint {
  if (!/^\d+(\.\d{1,9})?$/.test(value))
    throw new Error("Use a positive SOL amount with at most 9 decimals");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, "0"));
}
