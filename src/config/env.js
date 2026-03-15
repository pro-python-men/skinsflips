import fs from "node:fs";
import path from "node:path";

function parseDotenvFile(contents) {
  const env = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) env[key] = value;
  }

  return env;
}

export function loadEnv({ rootDir = process.cwd() } = {}) {
  const dotenvPath = path.join(rootDir, ".env");
  if (!fs.existsSync(dotenvPath)) return;

  const parsed = parseDotenvFile(fs.readFileSync(dotenvPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Load `.env` as early as possible for all modules (db config imports, etc.).
loadEnv({ rootDir: process.cwd() });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function number(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (Number.isNaN(value)) throw new Error(`Invalid number env var: ${name}`);
  return value;
}

export function getConfig() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const jwtSecret = process.env.JWT_SECRET || "";

  if (nodeEnv === "production" && !jwtSecret) {
    throw new Error("JWT_SECRET is required in production");
  }

  return {
    nodeEnv,
    port: number("PORT", 4000),
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
    jwt: {
      secret: jwtSecret || "dev-insecure-secret",
      expiresInSeconds: number("JWT_EXPIRES_IN_SECONDS", 60 * 60 * 24 * 7) // 7d
    },
    bcrypt: {
      saltRounds: number("BCRYPT_SALT_ROUNDS", 12)
    },
    database: {
      url: process.env.DATABASE_URL || "",
      host: process.env.DB_HOST || "localhost",
      port: number("DB_PORT", 5432),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      name: process.env.DB_NAME || "saas",
      ssl: (process.env.DB_SSL || "").toLowerCase() === "true"
    }
  };
}
