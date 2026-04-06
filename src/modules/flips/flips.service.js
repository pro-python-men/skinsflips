import { ApiError } from "../../shared/errors/ApiError.js";
import {
  getFlipsByUserId,
  createFlip,
  getFlipHistoryByUserId,
  createTrackedFlip,
  completeTrackedFlip
} from "./flips.repository.js";
import { fetchSkinportItems } from "./skinport.client.js";
import { fetchCsfloatListings } from "./csfloat.client.js";

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

  const profitExpected = computeProfitAfterSellFee({
    buyUsd: buy,
    sellUsd: expectedSell,
    sellSource: normalizedSourceSell
  });

  return await createTrackedFlip({
    userId,
    skinName: normalizedSkin,
    buyPrice: buy,
    sellPriceExpected: expectedSell,
    profitExpected,
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
  const profitActual = computeProfitAfterSellFee({
    buyUsd: buy,
    sellUsd: sell,
    sellSource: String(trackedFlip.source_sell || "")
  });
  const completed = await completeTrackedFlip({
    userId,
    id: flipId,
    sellPriceActual: sell,
    profitActual
  });

  if (!completed) {
    throw ApiError.notFound("Tracked flip not found");
  }

  return completed;
}
function toCentsFromUsdFloat(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function feeCents(sellCents, feeRate, mode = "ceil") {
  if (!feeRate) return 0;
  const raw =
    mode === "round" ? Math.round(sellCents * feeRate) : Math.ceil(sellCents * feeRate);
  return Math.max(1, raw);
}

function buildOpportunity({
  name,
  buyCents,
  sellCents,
  feeRateSell,
  feeMode = "ceil",
  sourceBuy,
  sourceSell
}) {
  if (!buyCents || !sellCents || buyCents <= 0 || sellCents <= 0) return null;

  const netSell = sellCents - feeCents(sellCents, feeRateSell, feeMode);
  const profitCents = netSell - buyCents;
  if (profitCents <= 0) return null;

  const roi = (profitCents / buyCents) * 100;

  return {
    id: `${sourceBuy}->${sourceSell}:${name}`,
    skin: name,
    buyPrice: buyCents / 100,
    sellPrice: sellCents / 100,
    profit: profitCents / 100,
    roi,
    sourceBuy,
    sourceSell,
    source: `${sourceBuy} -> ${sourceSell}`
  };
}

function toUsdCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function feeConfigForSellSource(source) {
  const s = String(source || "").toLowerCase();
  if (s.includes("csfloat")) return { feeRate: 0.02, mode: "ceil" };
  if (s.includes("skinport")) return { feeRate: 0.08, mode: "round" };
  return { feeRate: 0, mode: "round" };
}

function computeProfitAfterSellFee({ buyUsd, sellUsd, sellSource }) {
  const buyCents = toUsdCents(buyUsd);
  const sellCents = toUsdCents(sellUsd);
  if (!buyCents || !sellCents || buyCents <= 0 || sellCents <= 0) {
    return 0;
  }

  const { feeRate, mode } = feeConfigForSellSource(sellSource);
  const netSellCents = sellCents - feeCents(sellCents, feeRate, mode);
  const profitCents = netSellCents - buyCents;
  return profitCents / 100;
}

let cache = { at: 0, data: null };
const CACHE_MS = 60_000;

export async function getBestFlipsReal() {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_MS) return cache.data;

  const limit = Number(process.env.BEST_FLIPS_LIMIT || 50);
  const minQty = Number(process.env.BEST_FLIPS_MIN_SKINPORT_QTY || 0);

  const [skinportItems, csfloat] = await Promise.all([
    fetchSkinportItems({ appId: 730, currency: "USD", tradable: 1 }),
    fetchCsfloatListings({ limit: 50, sortBy: "best_deal", type: "buy_now" })
  ]);

  const csfloatMinPriceByName = new Map();
  for (const row of Array.isArray(csfloat?.data) ? csfloat.data : []) {
    const name = row?.item?.market_hash_name;
    const priceCents = Number(row?.price);
    if (typeof name !== "string" || !name) continue;
    if (!Number.isFinite(priceCents) || priceCents <= 0) continue;

    const prev = csfloatMinPriceByName.get(name);
    if (prev === undefined || priceCents < prev) csfloatMinPriceByName.set(name, priceCents);
  }

  const out = [];
  for (const it of Array.isArray(skinportItems) ? skinportItems : []) {
    const name = it?.market_hash_name;
    if (typeof name !== "string" || !name) continue;

    const qty = Number(it?.quantity ?? 0);
    if (Number.isFinite(minQty) && minQty > 0 && qty < minQty) continue;

    const skinportBuy = toCentsFromUsdFloat(it?.min_price);
    const skinportSell = toCentsFromUsdFloat(it?.mean_price);
    const csfloatBuySell = csfloatMinPriceByName.get(name); // cents

    // A) Buy Skinport -> Sell CSFloat (CSFloat fee 2%)
    const a = buildOpportunity({
      name,
      buyCents: skinportBuy,
      sellCents: csfloatBuySell,
      feeRateSell: 0.02,
      feeMode: "ceil",
      sourceBuy: "Skinport",
      sourceSell: "CSFloat"
    });
    if (a) out.push(a);

    // B) Buy CSFloat -> Sell Skinport (Skinport fee 8%)
    const b = buildOpportunity({
      name,
      buyCents: csfloatBuySell,
      sellCents: skinportSell,
      feeRateSell: 0.08,
      feeMode: "round",
      sourceBuy: "CSFloat",
      sourceSell: "Skinport"
    });
    if (b) out.push(b);
  }

  out.sort((x, y) => y.roi - x.roi);
  const sliced = out.slice(0, Number.isFinite(limit) ? limit : 50);

  cache = { at: now, data: sliced };
  return sliced;
}
