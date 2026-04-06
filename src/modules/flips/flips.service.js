import { ApiError } from "../../shared/errors/ApiError.js";
import {
  getFlipsByUserId,
  createFlip,
  getFlipHistoryByUserId,
  createTrackedFlip,
  completeTrackedFlip
} from "./flips.repository.js";

function asPositiveNumber(value, name) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw ApiError.badRequest(`${name} must be a positive number`);
  }
  return numberValue;
}

export async function listFlips({ userId }) {
  return await getFlipsByUserId(userId);
}

export async function addFlip({ userId, skin, buyPrice, sellPrice }) {
  if (typeof skin !== "string" || !skin.trim()) {
    throw ApiError.badRequest("skin is required");
  }

  const buy = asPositiveNumber(buyPrice, "buyPrice");
  const sell = asPositiveNumber(sellPrice, "sellPrice");

  return await createFlip({
    userId,
    skin: skin.trim(),
    buyPrice: buy,
    sellPrice: sell
  });
}

function asRequiredText(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw ApiError.badRequest(`${name} is required`);
  }

  return value.trim();
}

export async function listTrackedFlips({ userId }) {
  return await getFlipHistoryByUserId(userId);
}

export async function trackFlip({
  userId,
  skinName,
  buyPrice,
  sellPriceExpected,
  sourceBuy,
  sourceSell
}) {
  const buy = asPositiveNumber(buyPrice, "buyPrice");
  const expectedSell = asPositiveNumber(sellPriceExpected, "sellPriceExpected");
  const normalizedSkin = asRequiredText(skinName, "skinName");
  const normalizedSourceBuy = asRequiredText(sourceBuy, "sourceBuy");
  const normalizedSourceSell = asRequiredText(sourceSell, "sourceSell");

  return await createTrackedFlip({
    userId,
    skinName: normalizedSkin,
    buyPrice: buy,
    sellPriceExpected: expectedSell,
    profitExpected: expectedSell - buy,
    sourceBuy: normalizedSourceBuy,
    sourceSell: normalizedSourceSell
  });
}

export async function completeFlip({ userId, id, sellPriceActual }) {
  const flipId = Number(id);
  if (!Number.isInteger(flipId) || flipId <= 0) {
    throw ApiError.badRequest("id must be a valid number");
  }

  const sell = asPositiveNumber(sellPriceActual, "sellPriceActual");
  const existing = await getFlipHistoryByUserId(userId);
  const trackedFlip = existing.find((flip) => Number(flip.id) === flipId);

  if (!trackedFlip) {
    throw ApiError.notFound("Tracked flip not found");
  }

  if (trackedFlip.status !== "tracked") {
    throw ApiError.conflict("Flip is already completed");
  }

  const buy = Number(trackedFlip.buy_price);
  const completed = await completeTrackedFlip({
    userId,
    id: flipId,
    sellPriceActual: sell,
    profitActual: sell - buy
  });

  if (!completed) {
    throw ApiError.notFound("Tracked flip not found");
  }

  return completed;
}
