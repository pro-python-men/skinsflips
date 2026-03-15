import {
  getStatsByUserId,
  getInventoryValueByUserId
} from "./stats.repository.js";

export async function fetchStats({ userId }) {
  const [flipStats, inventoryStats] = await Promise.all([
    getStatsByUserId(userId),
    getInventoryValueByUserId(userId)
  ]);

  return {
    totalProfit: Number(flipStats.total_profit),
    averageRoi: Number(flipStats.average_roi),
    totalFlips: Number(flipStats.total_flips),
    inventoryValue: Number(inventoryStats.inventory_value)
  };
}
