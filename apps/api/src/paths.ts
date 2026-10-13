import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
let root = dirname(fileURLToPath(import.meta.url));
while (!existsSync(join(root, "database/migrations"))) {
  const parent = dirname(root);
  if (parent === root) throw new Error("Cannot locate wallet project root");
  root = parent;
}
export const projectRoot = root;
