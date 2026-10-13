import { createServer } from "node:http";
import { once } from "node:events";
import { strict as assert } from "node:assert";
import handler from "../api/index.js";

process.env.NODE_ENV = "production";
const server = createServer(handler).listen(0, "127.0.0.1");
await once(server, "listening");
let code = 0;
try {
  const port = server.address();
  assert(port && typeof port !== "string");
  const base = `http://127.0.0.1:${port.port}/api`;
  let walletAddress = "";
  for (const endpoint of [
    "/health",
    "/wallet",
    "/wallet/deposit-address",
    "/wallet/balance",
    "/wallet/transactions",
  ]) {
    const response = await fetch(base + endpoint);
    assert.equal(response.status, 200, endpoint);
    const body = await response.json();
    if (endpoint === "/wallet") walletAddress = body.address;
    if (
      endpoint === "/wallet/deposit-address" ||
      endpoint === "/wallet/balance"
    )
      assert.equal(body.address, walletAddress);
    if (endpoint === "/wallet/balance")
      assert.equal(body.network, "solana-devnet");
    assert(!JSON.stringify(body).includes("encrypted_secret"));
    console.log(`PASS serverless ${endpoint}`);
  }
} catch (error) {
  console.error(error);
  code = 1;
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
// This smoke test owns its temporary HTTP server and exits after all assertions.
process.exit(code);
