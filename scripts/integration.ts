import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import { Keypair } from "@solana/web3.js";
import { loadConfig } from "../apps/api/src/config.js";
import { migrate, seed } from "../apps/api/src/database.js";
import {
  WalletService,
  PostgresWalletRepository,
} from "../apps/api/src/wallet.js";
import { SolanaDevnetProvider } from "../apps/api/src/blockchain.js";
import { decryptSecret } from "../apps/api/src/encryption.js";
import { createApp } from "../apps/api/src/app.js";
const config = loadConfig();
const pool = new Pool({ connectionString: config.DATABASE_URL });
const schema = `test_${randomUUID().replaceAll("-", "")}`;
await pool.query(`CREATE SCHEMA ${schema}`);
const isolated = new Pool({
  connectionString: config.DATABASE_URL,
  options: `-c search_path=${schema}`,
});
try {
  await migrate(isolated);
  await migrate(isolated);
  await seed(isolated);
  await seed(isolated);
  const users = await isolated.query("SELECT id FROM users");
  assert.equal(users.rows.length, 1);
  assert.equal(users.rows[0].id, "demo-user-001");
  const provider = new SolanaDevnetProvider(config.SOLANA_RPC_URL);
  const service = new WalletService(
    new PostgresWalletRepository(isolated),
    provider,
    config.WALLET_ENCRYPTION_KEY,
  );
  const wallets = await Promise.all(
    Array.from({ length: 5 }, () => service.getWallet("demo-user-001")),
  );
  assert(wallets.every((w) => w.address === wallets[0].address));
  const fresh = await new WalletService(
    new PostgresWalletRepository(isolated),
    provider,
    config.WALLET_ENCRYPTION_KEY,
  ).getWallet("demo-user-001");
  assert.equal(fresh.address, wallets[0].address);
  const stored = await isolated.query(
    "SELECT encrypted_secret FROM wallet_accounts",
  );
  assert.equal(stored.rows.length, 1);
  const secret = decryptSecret(
    stored.rows[0].encrypted_secret,
    config.WALLET_ENCRYPTION_KEY,
  );
  assert.equal(
    Keypair.fromSecretKey(secret).publicKey.toBase58(),
    fresh.address,
  );
  secret.fill(0);
  const server = createApp(service, isolated, config.WEB_ORIGIN).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((r) => server.once("listening", r));
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  try {
    for (const path of ["/health", "/wallet", "/wallet/deposit-address"]) {
      const res = await fetch(base + path);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert(!/encrypted_secret|privateKey|secretKey/.test(text));
    }
    const invalid = await fetch(base + "/wallet/withdrawals/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination: "bad", amount: "1" }),
    });
    assert.equal(invalid.status, 400);
    const unknown = await fetch(base + "/missing");
    assert.equal(unknown.status, 404);
    console.log(
      "PASS: clean migrations, repeat migration/seed, concurrent wallet creation, restart retrieval, encrypted key integrity, API health/address/validation, no secret exposure",
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  }
} finally {
  await isolated.end();
  await pool.query(`DROP SCHEMA ${schema} CASCADE`);
  await pool.end();
}
