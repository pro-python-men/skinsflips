import pool from "../../config/database.js";

export async function getUsers() {
  const result = await pool.query(
    "SELECT id, email, created_at FROM users ORDER BY created_at DESC"
  );
  return result.rows;
}
