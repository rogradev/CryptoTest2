import { Pool } from "pg";
import { loadConfig } from "./config.js";
import { SolanaDevnetProvider } from "./blockchain.js";
import { PostgresWalletRepository, WalletService } from "./wallet.js";
import { createApp } from "./app.js";

export function createRuntime() {
  const config = loadConfig();
  // Reused per warm function instance; use a pooled database URL on Vercel.
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true,
  });
  pool.on("error", () => console.error("An idle database connection failed; subsequent requests will reconnect."));
  const service = new WalletService(
    new PostgresWalletRepository(pool),
    new SolanaDevnetProvider(config.SOLANA_RPC_URL),
    config.WALLET_ENCRYPTION_KEY,
  );
  return { config, pool, app: createApp(service, pool, config.WEB_ORIGIN) };
}
