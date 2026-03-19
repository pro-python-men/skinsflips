import { getConfig } from "../../config/env.js";
import { ApiError } from "../errors/ApiError.js";
import { verifyJwt } from "../security/jwt.js";

function getTokenFromRequest(req) {
  const fromCookie = req.cookies?.token;
  if (typeof fromCookie === "string" && fromCookie) return fromCookie;
  return null;
}

export function requireAuth(req, _res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return next(ApiError.unauthorized());

  try {
    const config = getConfig();
    const payload = verifyJwt(token, { secret: config.jwt.secret });
    const userId = Number(payload.sub);
    if (!userId) return next(ApiError.unauthorized());

    req.user = { id: userId, email: payload.email || null, steamId: payload.steamId || null };
    return next();
  } catch (err) {
    return next(err);
  }
}
