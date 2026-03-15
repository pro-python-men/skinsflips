import bcrypt from "bcrypt";
import { ApiError } from "../../shared/errors/ApiError.js";
import { getConfig } from "../../config/env.js";
import { signJwt } from "../../shared/security/jwt.js";
import { createUser, findUserByEmail } from "./auth.repository.js";

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

export async function registerUser({ email, password }) {
  if (!isValidEmail(email)) throw ApiError.badRequest("Invalid email");
  if (!isValidPassword(password)) {
    throw ApiError.badRequest("Password must be at least 8 characters");
  }

  const existing = await findUserByEmail(email.toLowerCase());
  if (existing) throw ApiError.conflict("Email already registered");

  const config = getConfig();
  const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
  const user = await createUser({ email: email.toLowerCase(), passwordHash });

  const token = signJwt(
    { sub: String(user.id), email: user.email },
    {
      secret: config.jwt.secret,
      expiresInSeconds: config.jwt.expiresInSeconds
    }
  );

  return { token, user: { id: user.id, email: user.email } };
}

export async function loginUser({ email, password }) {
  if (!isValidEmail(email)) throw ApiError.badRequest("Invalid email");
  if (typeof password !== "string") throw ApiError.badRequest("Invalid password");

  const user = await findUserByEmail(email.toLowerCase());
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  let ok = false;
  try {
    ok = await bcrypt.compare(password, user.password_hash);
  } catch {
    ok = false;
  }
  if (!ok) throw ApiError.unauthorized("Invalid email or password");

  const config = getConfig();
  const token = signJwt(
    { sub: String(user.id), email: user.email },
    {
      secret: config.jwt.secret,
      expiresInSeconds: config.jwt.expiresInSeconds
    }
  );

  return { token, user: { id: user.id, email: user.email } };
}
