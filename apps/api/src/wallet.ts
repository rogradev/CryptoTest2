import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { BlockchainProvider } from "./blockchain.js";
import { encryptSecret } from "./encryption.js";
import {
  lamportsToSol,
  type WalletView,
} from "../../../packages/shared/src/index.js";
export interface StoredWallet {
  id: string;
  user_id: string;
  address: string;
  created_at: Date;
}
export interface WalletRepository {
  find(userId: string): Promise<StoredWallet | null>;
  create(
    userId: string,
    address: string,
    encryptedSecret: string,
  ): Promise<StoredWallet>;
}
export class PostgresWalletRepository implements WalletRepository {
  constructor(private pool: Pool) {}
  async find(userId: string) {
    return (
      (
        await this.pool.query<StoredWallet>(
          "SELECT id,user_id,address,created_at FROM wallet_accounts WHERE user_id=$1 AND network=$2",
          [userId, "solana-devnet"],
        )
      ).rows[0] ?? null
    );
  }
  async create(userId: string, address: string, encryptedSecret: string) {
    await this.pool.query(
      "INSERT INTO wallet_accounts(id,user_id,network,address,encrypted_secret) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,network) DO NOTHING",
      [randomUUID(), userId, "solana-devnet", address, encryptedSecret],
    );
    const wallet = await this.find(userId);
    if (!wallet) throw new Error("Wallet persistence failed");
    return wallet;
  }
}
export class WalletService {
  constructor(
    private repository: WalletRepository,
    private blockchain: BlockchainProvider,
    private key: string,
  ) {}
  async getWallet(userId: string): Promise<WalletView> {
    let w = await this.repository.find(userId);
    if (!w) {
      const generated = await this.blockchain.createWallet();
      try {
        w = await this.repository.create(
          userId,
          generated.address,
          encryptSecret(generated.secret, this.key),
        );
      } finally {
        generated.secret.fill(0);
      }
    }
    return {
      userId,
      network: "solana-devnet",
      address: w.address,
      createdAt: w.created_at.toISOString(),
    };
  }
  async getOnChainBalance(userId: string) {
    const w = await this.getWallet(userId);
    const amount = await this.blockchain.getBalance(w.address);
    return {
      network: w.network,
      address: w.address,
      balanceLamports: amount.toString(),
      balanceSol: lamportsToSol(amount),
      observedAt: new Date().toISOString(),
      source: "on-chain" as const,
    };
  }
  async getTransactions(userId: string) {
    const w = await this.getWallet(userId);
    return this.blockchain.getRecentTransactions(w.address);
  }
}
