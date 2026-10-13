import { Pool } from "pg";
import { loadConfig } from "./config.js";
import { SolanaDevnetProvider } from "./blockchain.js";
import { PostgresWalletRepository, WalletService } from "./wallet.js";
import { createApp } from "./app.js";
const config = loadConfig();
const pool = new Pool({ connectionString: config.DATABASE_URL });
await pool.query("SELECT 1");
const service = new WalletService(
  new PostgresWalletRepository(pool),
  new SolanaDevnetProvider(config.SOLANA_RPC_URL),
  config.WALLET_ENCRYPTION_KEY,
);
const server = createApp(service, pool, config.WEB_ORIGIN).listen(
  config.PORT,
  "0.0.0.0",
  () =>
    console.log(
      `Wallet API listening on ${config.PORT} · SOLANA DEVNET · development demo`,
    ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
