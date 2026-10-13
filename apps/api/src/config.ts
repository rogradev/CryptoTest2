import { z } from "zod";
import dotenv from "dotenv";
import { join } from "node:path";

dotenv.config({
  path: [join(process.cwd(), ".env"), join(process.cwd(), "../../.env")],
  quiet: true,
});
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .refine((v) => /^postgres(ql)?:/.test(v), "PostgreSQL URL required"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  SOLANA_CLUSTER: z.literal("devnet").default("devnet"),
  SOLANA_RPC_URL: z
    .string()
    .url()
    .refine((v) => new URL(v).protocol === "https:", "HTTPS RPC required")
    .refine(
      (v) => !/mainnet|testnet/i.test(new URL(v).hostname),
      "Only Devnet endpoints are allowed",
    )
    .default("https://api.devnet.solana.com"),
  WALLET_ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, "Supply 32 bytes as 64 hexadecimal characters"),
});
export function loadConfig() {
  return envSchema.parse(process.env);
}
