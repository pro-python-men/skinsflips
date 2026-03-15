import fs from "node:fs";
import path from "node:path";
import pool from "../config/database.js";

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      run_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedVersions() {
  const result = await pool.query("SELECT version FROM schema_migrations");
  return new Set(result.rows.map((r) => r.version));
}

async function runMigration(version, sql) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations (version) VALUES ($1)",
      [version]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const migrationsDir = path.join(process.cwd(), "src", "database", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Missing migrations directory: ${migrationsDir}`);
    process.exitCode = 1;
    return;
  }

  await ensureMigrationsTable();
  const applied = await getAppliedVersions();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const version = file;
    if (applied.has(version)) continue;

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, "utf8");

    console.log(`Running migration: ${file}`);
    await runMigration(version, sql);
  }

  console.log("Migrations complete");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

