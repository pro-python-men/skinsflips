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
  deleteInventory,
  getInventorySource,
  syncInventoryFromSteam
} from "../modules/inventory/inventory.controller.js";
import { requireAuth } from "../shared/middleware/requireAuth.js";
import { rateLimit } from "../shared/middleware/rateLimit.js";
const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many login attempts, please try again later",
  keyPrefix: "auth"
});

const steamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many Steam login attempts, please try again later",
  keyPrefix: "steam-auth"
});

const publicBestFlipsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: "public-best-flips"
});

router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authLimiter, login);
router.post("/auth/steam/exchange", steamLimiter, steamExchange);
router.get("/auth/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime()
  });
});
router.get("/public/flips/best", publicBestFlipsLimiter, getBestFlips);

router.use(["/flips", "/stats", "/inventory", "/users"], requireAuth);
router.get("/flips/best", getBestFlips);
router.get("/flips", getFlips);
router.post("/flips", createFlip);
router.get("/flips/my", getMyTrackedFlips);
router.post("/flips/track", createTrackedFlip);
router.patch("/flips/:id/complete", markFlipAsCompleted);

router.get("/stats", getStats);

router.get("/inventory", getInventory);
router.get("/inventory/source", getInventorySource);
router.post("/inventory/sync", syncInventoryFromSteam);
router.post("/inventory", addInventory);
router.delete("/inventory/:id", deleteInventory);

router.get("/users", getUsers);

export default router;
