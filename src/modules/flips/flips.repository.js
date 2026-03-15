import pool from "../../config/database.js";

export async function getFlipsByUserId(userId) {
  const result = await pool.query(
    "SELECT * FROM flips WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function createFlip({ userId, skin, buyPrice, sellPrice }) {
  const profit = sellPrice - buyPrice;
  const roi = (profit / buyPrice) * 100;

  const result = await pool.query(
    `INSERT INTO flips (user_id, skin, buy_price, sell_price, profit, roi)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [userId, skin, buyPrice, sellPrice, profit, roi]
  );

  return result.rows[0];
}
