import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const path = new URL("../.env", import.meta.url);
if (!existsSync(path)) {
  const template = readFileSync(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );
  writeFileSync(
    path,
    template.replace(
      /^WALLET_ENCRYPTION_KEY=$/m,
      `WALLET_ENCRYPTION_KEY=${randomBytes(32).toString("hex")}`,
    ),
    { mode: 0o600 },
  );
  console.log(
    "Created ignored .env with a local Devnet encryption key. Keep it safe; do not regenerate after wallet creation.",
  );
} else console.log("Existing .env retained.");
