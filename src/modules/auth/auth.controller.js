import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import { registerUser, loginUser, steamExchangeUser } from "./auth.service.js";
import { getConfig } from "../../config/env.js";

function setAuthCookie(res, token) {
  const config = getConfig();
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
    maxAge: config.jwt.expiresInSeconds * 1000,
    path: "/"
  });
}

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
  const { openidParams } = req.body || {};
  const result = await steamExchangeUser({ openidParams });
  setAuthCookie(res, result.token);
  res.status(200).json(result);
});
