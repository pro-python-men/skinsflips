import { Router } from "express";
import { register, login, steamExchange } from "../modules/auth/auth.controller.js";
import {
  getFlips,
  createFlip,
  getBestFlips,
  getMyTrackedFlips,
  createTrackedFlip,
  markFlipAsCompleted
} from "../modules/flips/flips.controller.js";
import { getUsers } from "../modules/users/user.controller.js";
import { getStats } from "../modules/stats/stats.controller.js";
import {
  getInventory,
  addInventory,
  deleteInventory
} from "../modules/inventory/inventory.controller.js";
import { requireAuth } from "../shared/middleware/requireAuth.js";
const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime()
  });
});

router.use(["/flips", "/stats", "/inventory", "/users"], requireAuth);
router.get("/flips/best", getBestFlips);
router.get("/flips", getFlips);
router.post("/flips", createFlip);
router.get("/flips/my", getMyTrackedFlips);
router.post("/flips/track", createTrackedFlip);
router.patch("/flips/:id/complete", markFlipAsCompleted);
router.post("/auth/steam/exchange", steamExchange);

router.get("/stats", getStats);

router.get("/inventory", getInventory);
router.post("/inventory", addInventory);
router.delete("/inventory/:id", deleteInventory);

router.get("/users", getUsers);

export default router;
