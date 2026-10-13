import { createServer } from "node:http";
import { once } from "node:events";
import { it, expect, vi } from "vitest";

it("returns safe JSON when Vercel runtime configuration is invalid", async () => {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "invalid-private-connection-value");
  try {
    const { default: handler } = await import("../../../api/index.js");
    const server = createServer(handler).listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("No test listener");
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/health`,
      );
      expect(response.status).toBe(503);
      const body = await response.text();
      expect(JSON.parse(body).error.code).toBe("CONFIGURATION_ERROR");
      expect(body).not.toContain("invalid-private-connection-value");
      expect(body).not.toContain("stack");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  } finally {
    vi.unstubAllEnvs();
    vi.resetModules();
  }
});
