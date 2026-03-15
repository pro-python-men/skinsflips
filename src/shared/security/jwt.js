import crypto from "node:crypto";
import { ApiError } from "../errors/ApiError.js";

function base64UrlEncode(input) {
  const buffer = Buffer.isBuffer(input)
    ? input
    : Buffer.from(typeof input === "string" ? input : JSON.stringify(input));

  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecodeToString(input) {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  return Buffer.from(padded, "base64").toString("utf8");
}

function hmacSha256(input, secret) {
  return crypto.createHmac("sha256", secret).update(input).digest();
}

export function signJwt(payload, { secret, expiresInSeconds }) {
  const header = { alg: "HS256", typ: "JWT" };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(fullPayload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = base64UrlEncode(hmacSha256(signingInput, secret));
  return `${signingInput}.${signature}`;
}

export function verifyJwt(token, { secret }) {
  if (!token || typeof token !== "string") {
    throw ApiError.unauthorized("Missing token");
  }

  const parts = token.split(".");
  if (parts.length !== 3) throw ApiError.unauthorized("Invalid token");

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = base64UrlEncode(hmacSha256(signingInput, secret));

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw ApiError.unauthorized("Invalid token");
  }

  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecodeToString(encodedHeader));
    payload = JSON.parse(base64UrlDecodeToString(encodedPayload));
  } catch {
    throw ApiError.unauthorized("Invalid token");
  }

  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw ApiError.unauthorized("Invalid token");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp <= nowSeconds) {
    throw ApiError.unauthorized("Token expired");
  }

  return payload;
}

