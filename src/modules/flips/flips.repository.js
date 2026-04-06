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

export async function getFlipHistoryByUserId(userId) {
  const result = await pool.query(
    `
    SELECT *
    FROM flip_history
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function createTrackedFlip({
  userId,
  skinName,
  buyPrice,
  sellPriceExpected,
  profitExpected,
  sourceBuy,
  sourceSell
}) {
  const result = await pool.query(
    `
    INSERT INTO flip_history (
      user_id,
      skin_name,
      buy_price,
      sell_price_expected,
      profit_expected,
      source_buy,
      source_sell,
      status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,'tracked')
    RETURNING *
    `,
    [userId, skinName, buyPrice, sellPriceExpected, profitExpected, sourceBuy, sourceSell]
  );

  return result.rows[0];
}

export async function completeTrackedFlip({ userId, id, sellPriceActual, profitActual }) {
  const result = await pool.query(
    `
    UPDATE flip_history
    SET
      sell_price_actual = $3,
      profit_actual = $4,
      status = 'completed',
      completed_at = now()
    WHERE id = $1
      AND user_id = $2
      AND status = 'tracked'
    RETURNING *
    `,
    [id, userId, sellPriceActual, profitActual]
  );

  return result.rows[0] || null;
}
