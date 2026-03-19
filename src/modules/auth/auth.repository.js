import pool from "../../config/database.js";

export async function findUserByEmail(email) {
  const result = await pool.query(
    "SELECT id, email, steam_id, password_hash, created_at FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] || null;
}

export async function createUser({ email, passwordHash }) {
  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, steam_id, created_at",
    [email, passwordHash]
  );
  return result.rows[0];
}

export async function findUserBySteamId(steamId) {
  const result = await pool.query(
    "SELECT id, email, steam_id, created_at FROM users WHERE steam_id = $1",
    [steamId]
  );
  return result.rows[0] || null;
}

export async function createSteamUser({ steamId, email, passwordHash }) {
  const result = await pool.query(
    "INSERT INTO users (email, password_hash, steam_id) VALUES ($1, $2, $3) RETURNING id, email, steam_id, created_at",
    [email, passwordHash, steamId]
  );
  return result.rows[0];
}
