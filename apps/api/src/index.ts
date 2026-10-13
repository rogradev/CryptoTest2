import { createRuntime } from "./runtime.js";
const { config, pool, app } = createRuntime();
await pool.query("SELECT 1");
const server = app.listen(config.PORT, "0.0.0.0", () =>
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
