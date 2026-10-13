const { createRequire } = require("node:module");
const { join } = require("node:path");
const apiRequire = createRequire(join(__dirname, "../apps/api/package.json"));
const { Keypair } = apiRequire("@solana/web3.js");
if (!Keypair.generate().publicKey.toBase58())
  throw new Error("SDK failed to initialize");
console.log(
  "PASS: Solana SDK loads through CommonJS without require(ESM) support.",
);
