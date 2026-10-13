import type { IncomingMessage, ServerResponse } from "node:http";
import { createRuntime } from "../apps/api/src/runtime.js";

let runtime: ReturnType<typeof createRuntime> | undefined;
// Vercel manages HTTP and lifecycle; do not listen() or migrate on cold starts.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    runtime ??= createRuntime();
  } catch {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          code: "CONFIGURATION_ERROR",
          message:
            "Configure the server environment variables before using the demo.",
        },
      }),
    );
    return;
  }
  return runtime.app(req, res);
}
