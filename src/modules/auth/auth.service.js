import bcrypt from "bcrypt";
import { ApiError } from "../../shared/errors/ApiError.js";
import { getConfig } from "../../config/env.js";
import { signJwt } from "../../shared/security/jwt.js";
import {
  createUser,
  findUserByEmail,
  findUserBySteamId,
  createSteamUser
} from "./auth.repository.js";

const STEAM_WEB_API_KEY = process.env.STEAM_WEB_API_KEY || "";

async function fetchSteamProfile(steamId) {
  try {
    if (!STEAM_WEB_API_KEY) return { displayName: null, avatarUrl: null };

    const url = new URL(
      "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
    );
    url.searchParams.set("key", STEAM_WEB_API_KEY);
    url.searchParams.set("steamids", steamId);

    const res = await fetch(url.toString());
    if (!res.ok) return { displayName: null, avatarUrl: null };

    const data = await res.json().catch(() => null);
    const player = data?.response?.players?.[0];

    const rawName = player?.personaname;
    const displayName =
      typeof rawName === "string" && rawName.trim() ? rawName.trim() : null;

    const rawAvatar =
      player?.avatarfull ?? player?.avatarmedium ?? player?.avatar ?? null;
    const avatarUrl =
      typeof rawAvatar === "string" && rawAvatar.trim() ? rawAvatar.trim() : null;

    return { displayName, avatarUrl };
  } catch {
    return { displayName: null, avatarUrl: null };
  }
}

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

function isValidSteamId(steamId) {
  return typeof steamId === "string" && /^[0-9]{17}$/.test(steamId);
}

export async function steamExchangeUser({ steamId }) {
  if (!isValidSteamId(steamId)) throw ApiError.badRequest("Invalid steamId");

  let user = await findUserBySteamId(steamId);

  if (!user) {
    const email = `steam_${steamId}@local`;
    const passwordHash = "DISABLED_STEAM";
    user = await createSteamUser({ steamId, email, passwordHash });
  }

  const { displayName, avatarUrl } = await fetchSteamProfile(steamId);

  const config = getConfig();
  const token = signJwt(
    {
      sub: String(user.id),
      email: user.email,
      steamId: user.steam_id || steamId,
      displayName,
      avatarUrl
    },
    { secret: config.jwt.secret, expiresInSeconds: config.jwt.expiresInSeconds }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      steamId: user.steam_id || steamId,
      displayName,
      avatarUrl
    }
  };
}
