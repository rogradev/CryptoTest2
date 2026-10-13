import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";
import type { TransactionView } from "../../../packages/shared/src/index.js";
export interface WalletResult {
  address: string;
  secret: Uint8Array;
}
export interface BlockchainProvider {
  createWallet(): Promise<WalletResult>;
  getBalance(address: string): Promise<bigint>;
  getRecentTransactions(address: string): Promise<TransactionView[]>;
}
export function isSolanaAddress(address: string): boolean {
  try {
    return new PublicKey(address).toBase58() === address;
  } catch {
    return false;
  }
}
export class SolanaDevnetProvider implements BlockchainProvider {
  private connection: Connection;
  private verified = false;
  constructor(url: string) {
    setGlobalDispatcher(new EnvHttpProxyAgent());
    this.connection = new Connection(url, {
      commitment: "confirmed",
      disableRetryOnRateLimit: true,
      fetch: (input, init) =>
        globalThis.fetch(input, {
          ...init,
          signal: AbortSignal.timeout(15000),
        }),
    });
  }
  async verifyNetwork() {
    if (!this.verified) {
      if (
        (await this.connection.getGenesisHash()) !==
        "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
      )
        throw new Error("RPC is not Solana Devnet");
      this.verified = true;
    }
  }
  async createWallet() {
    const wallet = Keypair.generate();
    return { address: wallet.publicKey.toBase58(), secret: wallet.secretKey };
  }
  async getBalance(address: string) {
    await this.verifyNetwork();
    const n = await this.connection.getBalance(new PublicKey(address));
    if (!Number.isSafeInteger(n) || n < 0)
      throw new Error("Unsafe RPC balance");
    return BigInt(n);
  }
  async getRecentTransactions(address: string) {
    await this.verifyNetwork();
    return (
      await this.connection.getSignaturesForAddress(new PublicKey(address), {
        limit: 10,
      })
    ).map((t) => ({
      signature: t.signature,
      slot: t.slot,
      status: t.err ? ("failed" as const) : ("confirmed" as const),
      blockTime: t.blockTime ?? null,
    }));
  }
}
