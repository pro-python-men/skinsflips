import pool from "../../config/database.js";

export async function getStatsByUserId(userId) {
  const result = await pool.query(
    `
    SELECT
      COALESCE(SUM(profit_actual), 0) AS total_profit,
      COALESCE(AVG(
        CASE
          WHEN buy_price > 0 AND profit_actual IS NOT NULL THEN (profit_actual / buy_price) * 100
          ELSE NULL
        END
      ), 0) AS average_roi,
      COUNT(*)::int AS total_flips
    FROM flip_history
    WHERE user_id = $1
      AND status = 'completed'
  `,
    [userId]
  );

  return result.rows[0] || { total_profit: 0, average_roi: 0, total_flips: 0 };
}

export async function getInventoryValueByUserId(userId) {
  const result = await pool.query(
    `
    SELECT COALESCE(SUM(current_price * quantity), 0) AS inventory_value
    FROM inventory
    WHERE user_id = $1
  `,
    [userId]
  );

  return result.rows[0] || { inventory_value: 0 };
}
