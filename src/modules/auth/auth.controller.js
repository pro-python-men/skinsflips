import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import { registerUser, loginUser, steamExchangeUser } from "./auth.service.js";

export const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const result = await registerUser({ email, password });
  res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const result = await loginUser({ email, password });
  res.status(200).json(result);
});

export const steamExchange = asyncHandler(async (req, res) => {
  const { steamId } = req.body || {};
  const result = await steamExchangeUser({ steamId });
  res.status(200).json(result);
});
