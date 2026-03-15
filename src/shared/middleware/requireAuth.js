import { getConfig } from "../../config/env.js";
import { ApiError } from "../errors/ApiError.js";
import { verifyJwt } from "../security/jwt.js";

export function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) return next(ApiError.unauthorized());

  try {
    const config = getConfig();
    const payload = verifyJwt(token, { secret: config.jwt.secret });
    const userId = Number(payload.sub);
    if (!userId) return next(ApiError.unauthorized());

    req.user = { id: userId, email: payload.email || null };
    return next();
  } catch (err) {
    return next(err);
  }
}

