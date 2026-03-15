import pool from "../../config/database.js";

export async function getInventoryByUserId(userId) {
  const result = await pool.query(
    "SELECT * FROM inventory WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function insertInventoryItem({
  userId,
  skin,
  purchasePrice,
  currentPrice,
  quantity
}) {
  const result = await pool.query(
    `INSERT INTO inventory (user_id, skin, purchase_price, current_price, quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, skin, purchasePrice, currentPrice, quantity]
  );

  return result.rows[0];
}

export async function deleteInventoryItemById({ userId, id }) {
  const result = await pool.query(
    "DELETE FROM inventory WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId]
  );
  return Boolean(result.rows[0]);
}

