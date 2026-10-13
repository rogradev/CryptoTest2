import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import type { Pool } from "pg";
import type { WalletService } from "./wallet.js";
import { isSolanaAddress } from "./blockchain.js";
import { solToLamports } from "../../../packages/shared/src/index.js";
declare module "express-serve-static-core" {
  interface Request {
    user: { id: string };
  }
}
export const DemoUserMiddleware: express.RequestHandler = (req, _res, next) => {
  req.user = { id: "demo-user-001" };
  next();
};
export function createApp(service: WalletService, pool: Pool, origin: string) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet(), cors({ origin }), express.json({ limit: "8kb" }));
  app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok", network: "solana-devnet", demoMode: true });
  });
  app.use("/api/wallet", DemoUserMiddleware);
  app.get("/api/wallet", async (req, res) =>
    res.json(await service.getWallet(req.user.id)),
  );
  app.get("/api/wallet/deposit-address", async (req, res) =>
    res.json(await service.getWallet(req.user.id)),
  );
  app.get("/api/wallet/balance", async (req, res) =>
    res.json(await service.getOnChainBalance(req.user.id)),
  );
  app.get("/api/wallet/transactions", async (req, res) =>
    res.json({
      transactions: await service.getTransactions(req.user.id),
      source: "solana-devnet-signatures",
    }),
  );
  app.post("/api/wallet/withdrawals/validate", async (req, res) => {
    const { destination, amount } = z
      .object({
        destination: z
          .string()
          .refine(isSolanaAddress, "Invalid Solana address"),
        amount: z.string().regex(/^\d+(\.\d{1,9})?$/),
      })
      .parse(req.body);
    const lamports = solToLamports(amount);
    if (lamports <= 0n)
      throw new z.ZodError([
        {
          code: "custom",
          path: ["amount"],
          message: "Amount must be greater than zero",
        },
      ]);
    const balance = await service.getOnChainBalance(req.user.id);
    res.json({
      valid: lamports <= BigInt(balance.balanceLamports),
      destination,
      amountLamports: lamports.toString(),
      broadcastEnabled: false,
      message:
        "Validation only. Network fees are not included; withdrawal broadcasting is the next milestone.",
    });
  });
  app.use((_req, res) =>
    res
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } }),
  );
  app.use(((error, _req, res, _next) => {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request",
            issues: error.issues.map((i) => ({
              path: i.path,
              message: i.message,
            })),
          },
        });
      return;
    }
    if (error instanceof SyntaxError) {
      res
        .status(400)
        .json({
          error: { code: "INVALID_JSON", message: "Invalid JSON body" },
        });
      return;
    }
    res
      .status(503)
      .json({
        error: {
          code: "SERVICE_UNAVAILABLE",
          message:
            "Database or Solana Devnet is unavailable. Try again shortly.",
        },
      });
  }) as express.ErrorRequestHandler);
  return app;
}
