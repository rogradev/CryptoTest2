import { Pool } from "pg";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { projectRoot } from "./paths.js";
import { loadConfig } from "./config.js";
export async function migrate(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(827310)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const dir = join(projectRoot, "database/migrations");
    for (const name of (await readdir(dir))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      if (
        (
          await client.query(
            "SELECT name FROM schema_migrations WHERE name=$1",
            [name],
          )
        ).rowCount
      )
        continue;
      await client.query(await readFile(`${dir}/${name}`, "utf8"));
      await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [
        name,
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function seed(pool: Pool) {
  await pool.query("INSERT INTO users(id) VALUES($1) ON CONFLICT DO NOTHING", [
    "demo-user-001",
  ]);
}
if (process.argv[2] === "migrate" || process.argv[2] === "seed") {
  const pool = new Pool({ connectionString: loadConfig().DATABASE_URL });
  try {
    await (process.argv[2] === "migrate" ? migrate(pool) : seed(pool));
    console.log(`${process.argv[2]} complete`);
  } finally {
    await pool.end();
  }
}
