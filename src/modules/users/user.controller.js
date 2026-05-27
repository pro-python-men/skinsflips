import { ApiError } from "../../shared/errors/ApiError.js";

export async function getUsers(_req, _res, next) {
  return next(ApiError.forbidden("Admin access required"));
}
