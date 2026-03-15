import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import { fetchStats } from "./stats.service.js";

export const getStats = asyncHandler(async (req, res) => {
  const stats = await fetchStats({ userId: req.user.id });
  res.json(stats);
});
