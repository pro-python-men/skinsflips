import { ApiError } from "../../shared/errors/ApiError.js";
import {
  getFlipsByUserId,
  createFlip,
  getFlipHistoryByUserId,
  createTrackedFlip,
  completeTrackedFlip
} from "./flips.repository.js";
import { fetchSkinportItems, fetchSkinportSalesHistory } from "./skinport.client.js";
import { fetchCsfloatListings } from "./csfloat.client.js";
import {
  fetchBuffmarketGoodsSearch,
  pickBuffmarketBuyCentsFromGoodsRow
} from "./buffmarket.client.js";

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

function envRate(name, fallback) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return fallback;
  if (n <= 0 || n >= 1) return fallback;
  return n;
}

function envUsdThresholdToCents(name, fallbackUsd = 0) {
  const raw = process.env[name];
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return Math.round(Number(fallbackUsd) * 100);
  return Math.round(n * 100);
}

function skinportSellFeeRateForSellCents(sellCents) {
  const standard = envRate("SKINPORT_FEE_STANDARD", 0.08);
  const highTier = envRate("SKINPORT_FEE_HIGH_TIER", 0.06);
  const thresholdCents = envUsdThresholdToCents("SKINPORT_HIGH_TIER_THRESHOLD_USD", 0);

  if (thresholdCents > 0 && Number(sellCents) >= thresholdCents) return highTier;
  return standard;
}

function getLiquidityLabel(listingCount) {
  if (listingCount > 50) return "high";
  if (listingCount > 10) return "medium";
  return "low";
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function liquidityScoreFromLabel(label) {
  if (label === "HIGH") return 1;
  if (label === "MEDIUM") return 0.7;
  return 0.3;
}

function profitScoreFromPercent(profitPercent) {
  return clamp01((Number(profitPercent) || 0) / 20);
}

function calculateConfidence({ profitPercent, liquidityLabel, stabilityScore }) {
  const profitScore = profitScoreFromPercent(profitPercent);
  const liquidityScore = liquidityScoreFromLabel(liquidityLabel);
  const stability = clamp01(stabilityScore);

  const confidence01 = profitScore * 0.4 + liquidityScore * 0.4 + stability * 0.2;
  return Math.round(clamp01(confidence01) * 100);
}

function getEta(liquidity) {
  if (liquidity === "HIGH") return "~2 days";
  if (liquidity === "MEDIUM") return "~4 days";
  if (liquidity === "LOW") return "~7 days";
  return "~4 days";
}

function toUsdCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function toOptionalUsdCents(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && !value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function toOptionalPercent(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && !value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function toOptionalBool(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (!s) return null;
  if (s === "1" || s === "true" || s === "yes" || s === "y") return true;
  if (s === "0" || s === "false" || s === "no" || s === "n") return false;
  return null;
}

function minProfitCentsFromBudget(maxBuyCents) {
  const budget = Number(maxBuyCents);
  if (!Number.isFinite(budget) || budget <= 0) return 200;
  // For low budgets, allow smaller absolute profit so deals can still appear.
  // Examples:
  //  - $20 budget -> max(50c, 2% of budget) = 50c
  //  - $50 budget -> 2% => $1
  //  - $100 budget -> 2% => $2 (default)
  const twoPercent = Math.round(budget * 0.02);
  return Math.min(200, Math.max(50, twoPercent));
}

function safeMedian(values) {
  const arr = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (arr.length === 0) return null;
  arr.sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 1) return arr[mid];
  return (arr[mid - 1] + arr[mid]) / 2;
}

function average(values) {
  const arr = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function averageLowestListings(pricesCents, maxCount = 3) {
  const prices = (Array.isArray(pricesCents) ? pricesCents : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b)
    .slice(0, Math.max(1, Math.min(3, Number(maxCount) || 3)));

  if (prices.length === 0) return null;
  if (prices.length === 1) return prices[0];

  const med = safeMedian(prices);
  if (!med) return prices[0];

  const filtered = prices.filter((p) => p >= med * 0.7 && p <= med * 1.3);
  const avg = average(filtered);
  return avg ? Math.round(avg) : prices[0];
}

function pickSellFromSalesStats(stats) {
  const s = stats && typeof stats === "object" ? stats : null;
  if (!s) return null;

  const s7 = s.last_7_days && typeof s.last_7_days === "object" ? s.last_7_days : null;
  const s30 = s.last_30_days && typeof s.last_30_days === "object" ? s.last_30_days : null;
  const s90 = s.last_90_days && typeof s.last_90_days === "object" ? s.last_90_days : null;

  const vol7 = s7 && Number.isFinite(Number(s7.volume)) ? Number(s7.volume) : 0;
  const vol30 = s30 && Number.isFinite(Number(s30.volume)) ? Number(s30.volume) : 0;
  const vol90 = s90 && Number.isFinite(Number(s90.volume)) ? Number(s90.volume) : 0;

  const median7 = s7 && Number.isFinite(Number(s7.median)) ? Number(s7.median) : null;
  const median30 = s30 && Number.isFinite(Number(s30.median)) ? Number(s30.median) : null;
  const median90 = s90 && Number.isFinite(Number(s90.median)) ? Number(s90.median) : null;

  const base = { salesLast7d: vol7, salesLast30d: vol30, salesLast90d: vol90 };

  if (median7 && vol7 > 0) return { sellUsd: median7, sourceWindow: "7d", ...base };
  if (median30 && vol30 > 0) return { sellUsd: median30, sourceWindow: "30d", ...base };
  if (median90 && vol90 > 0) return { sellUsd: median90, sourceWindow: "90d", ...base };

  return null;
}

function windowStats(obj, key) {
  const x = obj && typeof obj === "object" ? obj[key] : null;
  return x && typeof x === "object" ? x : null;
}

function scoreSalesWindow(stats, windowKey) {
  const w = windowStats(stats, windowKey);
  if (!w) return { volume: 0, median: null };
  const volume = Number.isFinite(Number(w.volume)) ? Number(w.volume) : 0;
  const median = Number.isFinite(Number(w.median)) ? Number(w.median) : null;
  return { volume, median };
}

function bestRowForWindow(rows, windowKey) {
  let best = null;
  let bestVol = -1;
  let bestMed = -1;

  for (const r of Array.isArray(rows) ? rows : []) {
    const { volume, median } = scoreSalesWindow(r, windowKey);
    if (!median || volume <= 0) continue;

    if (volume > bestVol) {
      best = r;
      bestVol = volume;
      bestMed = Number(median);
      continue;
    }

    if (volume === bestVol && Number(median) > bestMed) {
      best = r;
      bestVol = volume;
      bestMed = Number(median);
    }
  }

  return best;
}

function mergeSalesHistoryRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return null;

  const any = list[0];
  const best7 = bestRowForWindow(list, "last_7_days");
  const best30 = bestRowForWindow(list, "last_30_days");
  const best90 = bestRowForWindow(list, "last_90_days");

  return {
    market_hash_name: any?.market_hash_name,
    currency: any?.currency,
    last_7_days: best7?.last_7_days ?? { min: null, max: null, avg: null, median: null, volume: 0 },
    last_30_days: best30?.last_30_days ?? { min: null, max: null, avg: null, median: null, volume: 0 },
    last_90_days: best90?.last_90_days ?? { min: null, max: null, avg: null, median: null, volume: 0 }
  };
}

function stabilityScoreFromSalesStats(stats) {
  const s = stats && typeof stats === "object" ? stats : null;
  if (!s) return 0.6;

  const s7 = s.last_7_days && typeof s.last_7_days === "object" ? s.last_7_days : null;
  const s30 = s.last_30_days && typeof s.last_30_days === "object" ? s.last_30_days : null;
  const pref = s7 && Number(s7.volume) > 0 ? s7 : s30;
  if (!pref) return 0.6;

  const median = Number(pref.median);
  const min = Number(pref.min);
  const max = Number(pref.max);
  if (!Number.isFinite(median) || median <= 0) return 0.6;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) return 0.6;

  const spreadRatio = (max - min) / median;
  const score = 1 - spreadRatio / 0.5;
  return clamp01(score);
}

function liquidityLabelFromSalesOrListings({ salesLast7d, listingCount }) {
  const sales = Number(salesLast7d) || 0;
  if (sales > 20) return "HIGH";
  if (sales > 5) return "MEDIUM";

  const lc = Number.isFinite(Number(listingCount)) ? Number(listingCount) : 0;
  const base = getLiquidityLabel(lc);
  if (base === "high") return "HIGH";
  if (base === "medium") return "MEDIUM";
  return "LOW";
}

const BALANCED_MIN_PROFIT_PERCENT = 5;
const AGGRESSIVE_MIN_PROFIT_PERCENT = 3;
const AGGRESSIVE_MIN_PROFIT_CENTS = 25;
const CONSERVATIVE_MIN_PROFIT_PERCENT = BALANCED_MIN_PROFIT_PERCENT + 3;

const RISK_MODE_CONFIG = {
  conservative: {
    includeLowLiquidity: true,
    minProfitPercent: 0,
    minLiquidity: null
  },
  balanced: {
    includeLowLiquidity: true,
    minProfitPercent: 0,
    minLiquidity: null
  },
  aggressive: {
    includeLowLiquidity: true,
    minProfitPercent: 0,
    minProfitCents: 0,
    minLiquidity: null
  }
};

function normalizeRiskMode(mode) {
  const normalized = typeof mode === "string" ? mode.trim().toLowerCase() : "";
  if (normalized === "conservative" || normalized === "balanced" || normalized === "aggressive") {
    return normalized;
  }
  return "balanced";
}

function buildOpportunity({
  name,
  listingCount,
  sourceBuy,
  sourceSell,
  buyCents,
  sellCents,
  sellFeeRate,
  maxBuyCents,
  minProfitCents,
  minProfitPercent,
  includeLowLiquidity,
  minLiquidity,
  salesLast7d,
  salesLast30d,
  stabilityScore,
  sellWindow,
  priceLastUpdated,
  salesDataLastUpdated,
  sourceDataCached,
  debugSink
}) {
  const debug = typeof debugSink === "function" ? debugSink : null;
  if (!buyCents || !sellCents || buyCents <= 0 || sellCents <= 0) return null;
  if (maxBuyCents && Number(buyCents) > Number(maxBuyCents)) {
    if (debug) debug("buy_gt_budget");
    return null;
  }

  const marketplaceFeeCents = feeCents(sellCents, sellFeeRate, "ceil");
  const netSellCents = sellCents - marketplaceFeeCents;
  const profitCents = netSellCents - buyCents;
  if (profitCents <= 0) {
    if (debug) debug("profit_non_positive");
    return null;
  }

  const profitPercent = (profitCents / buyCents) * 100;
  const requiredProfitPercent =
    Number.isFinite(Number(minProfitPercent)) && Number(minProfitPercent) > 0
      ? Number(minProfitPercent)
      : 0;
  if (requiredProfitPercent > 0 && profitPercent < requiredProfitPercent) {
    if (debug) debug(`profit_percent_lt_${requiredProfitPercent}`);
    return null;
  }
  const requiredProfitCents =
    Number.isFinite(Number(minProfitCents)) && Number(minProfitCents) > 0
      ? Number(minProfitCents)
      : 0;
  if (requiredProfitCents > 0 && profitCents < requiredProfitCents) {
    if (debug) debug("profit_lt_min_usd");
    return null;
  }

  const normalizedListingCount = Number.isFinite(Number(listingCount))
    ? Math.max(0, Math.round(Number(listingCount)))
    : undefined;

  const liquidity = liquidityLabelFromSalesOrListings({
    salesLast7d,
    listingCount: normalizedListingCount ?? 0
  });

  const allowLow = includeLowLiquidity === true;
  if (minLiquidity === "HIGH" && liquidity !== "HIGH") {
    if (debug) debug("liquidity_not_high");
    return null;
  }

  if (!allowLow && liquidity === "LOW") {
    if (debug) debug("liquidity_low");
    return null;
  }

  const confidence = calculateConfidence({
    profitPercent,
    liquidityLabel: liquidity,
    stabilityScore
  });

  const rankScore = (profitCents / 100) * confidence;

  return {
    id: `${sourceBuy}->${sourceSell}:${name}`,
    itemName: name,
    name,
    buyPrice: buyCents / 100,
    sellPrice: sellCents / 100,
    marketplaceFee: marketplaceFeeCents / 100,
    marketplaceFeeRate: Number(sellFeeRate) || 0,
    netSell: netSellCents / 100,
    profit: profitCents / 100,
    profitPercent,
    roi: profitPercent,
    rankScore,
    listingCount: normalizedListingCount,
    liquidity,
    confidence,
    eta: getEta(liquidity),
    sourceBuy,
    sourceSell,
    sellWindow: typeof sellWindow === "string" ? sellWindow : undefined,
    salesLast7d: Number.isFinite(Number(salesLast7d)) ? Number(salesLast7d) : undefined,
    salesLast30d: Number.isFinite(Number(salesLast30d)) ? Number(salesLast30d) : undefined,
    stabilityScore: Number.isFinite(Number(stabilityScore)) ? Number(stabilityScore) : undefined,
    priceLastUpdated: Number.isFinite(Number(priceLastUpdated)) ? Number(priceLastUpdated) : undefined,
    salesDataLastUpdated: Number.isFinite(Number(salesDataLastUpdated))
      ? Number(salesDataLastUpdated)
      : undefined,
    dataStatus: sourceDataCached === true ? "cached" : undefined
  };
}

function feeConfigForSellSource(source, sellCents) {
  const s = String(source || "").toLowerCase();
  if (s.includes("csfloat")) return { feeRate: 0.02, mode: "ceil" };
  if (s.includes("skinport"))
    return { feeRate: skinportSellFeeRateForSellCents(sellCents), mode: "ceil" };
  if (s.includes("buff")) return { feeRate: envRate("BUFFMARKET_FEE_RATE", 0.025), mode: "ceil" };
  return { feeRate: 0, mode: "ceil" };
}

function computeProfitAfterSellFee({ buyUsd, sellUsd, sellSource }) {
  const buyCents = toUsdCents(buyUsd);
  const sellCents = toUsdCents(sellUsd);
  if (!buyCents || !sellCents || buyCents <= 0 || sellCents <= 0) {
    return 0;
  }

  const { feeRate, mode } = feeConfigForSellSource(sellSource, sellCents);
  const netSellCents = sellCents - feeCents(sellCents, feeRate, mode);
  const profitCents = netSellCents - buyCents;
  return profitCents / 100;
}

const bestFlipsCache = new Map();
const CACHE_MS = 5 * 60_000;

const csfloatResponseCache = new Map();
const CSFLOAT_CACHE_MS = 2 * 60_000;
let lastCsfloatRateLimitWarnAt = 0;
const CSFLOAT_RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;
let csfloatBlockedUntil = 0;

function csfloatResult(data, meta) {
  return { data, meta };
}

function csfloatCacheKey(params) {
  const sortBy = typeof params?.sortBy === "string" ? params.sortBy : "";
  const type = typeof params?.type === "string" ? params.type : "";
  const limit = Number(params?.limit) || 0;
  const marketHashName = typeof params?.marketHashName === "string" ? params.marketHashName : "";
  const cursor = typeof params?.cursor === "string" ? params.cursor : "";
  return JSON.stringify({ sortBy, type, limit, marketHashName, cursor });
}

async function fetchCsfloatListingsCached(params, { allowStaleOn429 = true } = {}) {
  const key = csfloatCacheKey(params);
  const now = Date.now();
  const cached = csfloatResponseCache.get(key) || null;
  if (cached && now - cached.at < CSFLOAT_CACHE_MS) {
    return csfloatResult(cached.data, {
      isCached: true,
      rateLimited: false,
      lastUpdated: cached.at || null
    });
  }
  if (now < csfloatBlockedUntil) {
    if (cached && cached.data) {
      return csfloatResult(cached.data, {
        isCached: true,
        rateLimited: true,
        lastUpdated: cached.at || null
      });
    }
    return csfloatResult(
      { data: [], cursor: null },
      { isCached: false, rateLimited: true, lastUpdated: null }
    );
  }

  try {
    const data = await fetchCsfloatListings(params);
    csfloatResponseCache.set(key, { at: now, data });
    return csfloatResult(data, { isCached: false, rateLimited: false, lastUpdated: now });
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "";
    const is429 = msg.includes("HTTP 429") || msg.toLowerCase().includes("too many requests");
    if (allowStaleOn429 && is429 && cached && cached.data) {
      return csfloatResult(cached.data, {
        isCached: true,
        rateLimited: true,
        lastUpdated: cached.at || null
      });
    }
    if (is429) {
      csfloatBlockedUntil = Date.now() + CSFLOAT_RATE_LIMIT_COOLDOWN_MS;
      if (Date.now() - lastCsfloatRateLimitWarnAt > 60_000) {
        lastCsfloatRateLimitWarnAt = Date.now();
        console.warn("[csfloat] rate limited - returning empty result");
      }
      return csfloatResult(
        { data: [], cursor: null },
        { isCached: false, rateLimited: true, lastUpdated: null }
      );
    }
    throw e;
  }
}

const buffmarketResponseCache = new Map();
const BUFFMARKET_CACHE_MS = 2 * 60_000;
let lastBuffmarketRateLimitWarnAt = 0;
const BUFFMARKET_RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;
let buffmarketBlockedUntil = 0;

function buffmarketResult(data, meta) {
  return { data, meta };
}

function buffmarketCacheKey(params) {
  const search = typeof params?.search === "string" ? params.search : "";
  const pageSize = Number(params?.pageSize) || 0;
  const pageNum = Number(params?.pageNum) || 0;
  const sortBy = typeof params?.sortBy === "string" ? params.sortBy : "";
  return JSON.stringify({ search, pageSize, pageNum, sortBy });
}

async function fetchBuffmarketGoodsSearchCached(params, { allowStaleOn429 = true } = {}) {
  const key = buffmarketCacheKey(params);
  const now = Date.now();
  const cached = buffmarketResponseCache.get(key) || null;

  if (cached && cached.data && now - cached.at < BUFFMARKET_CACHE_MS) {
    return buffmarketResult(cached.data, {
      isCached: true,
      rateLimited: false,
      lastUpdated: cached.at || null
    });
  }

  if (now < buffmarketBlockedUntil) {
    if (cached && cached.data) {
      return buffmarketResult(cached.data, {
        isCached: true,
        rateLimited: true,
        lastUpdated: cached.at || null
      });
    }
    return buffmarketResult({ items: [], page_num: 1, page_size: 0, total_count: 0, total_page: 0 }, {
      isCached: false,
      rateLimited: true,
      lastUpdated: null
    });
  }

  try {
    const data = await fetchBuffmarketGoodsSearch(params);
    buffmarketResponseCache.set(key, { at: now, data });
    return buffmarketResult(data, { isCached: false, rateLimited: false, lastUpdated: now });
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "";
    const is429 =
      msg.includes("HTTP 429") ||
      msg.toLowerCase().includes("too many requests") ||
      msg.toLowerCase().includes("rate limit");

    if (allowStaleOn429 && is429 && cached && cached.data) {
      return buffmarketResult(cached.data, {
        isCached: true,
        rateLimited: true,
        lastUpdated: cached.at || null
      });
    }

    if (is429) {
      buffmarketBlockedUntil = Date.now() + BUFFMARKET_RATE_LIMIT_COOLDOWN_MS;
      if (Date.now() - lastBuffmarketRateLimitWarnAt > 60_000) {
        lastBuffmarketRateLimitWarnAt = Date.now();
        console.warn("[buffmarket] rate limited - returning empty result");
      }
      return buffmarketResult(
        { items: [], page_num: 1, page_size: 0, total_count: 0, total_page: 0 },
        { isCached: false, rateLimited: true, lastUpdated: null }
      );
    }

    throw e;
  }
}

export async function getBestFlipsReal({
  maxBuyPrice,
  minProfitUsd,
  minProfitPercent,
  includeLowLiquidity,
  mode,
  buySources
} = {}) {
  const now = Date.now();
  const riskMode = normalizeRiskMode(mode);
  const riskModeConfig = RISK_MODE_CONFIG[riskMode];
  const maxBuyCents = toOptionalUsdCents(maxBuyPrice);
  const explicitIncludeLow = toOptionalBool(includeLowLiquidity);
  const includeLow =
    explicitIncludeLow === null ? riskModeConfig.includeLowLiquidity : explicitIncludeLow === true;
  const requestedMinProfitCents = toOptionalUsdCents(minProfitUsd);
  const requiredMinProfitCents =
    requestedMinProfitCents ??
    riskModeConfig.minProfitCents ??
    0;
  const requiredMinProfitPercent =
    toOptionalPercent(minProfitPercent) ?? riskModeConfig.minProfitPercent ?? 0;
  const requiredMinLiquidity = riskModeConfig.minLiquidity;

  const cacheKey = JSON.stringify({
    riskMode,
    maxBuyCents: maxBuyCents || null,
    minProfitCents: requiredMinProfitCents,
    minProfitPercent: requiredMinProfitPercent,
    minLiquidity: requiredMinLiquidity,
    includeLowLiquidity: includeLow,
    buySources:
      Array.isArray(buySources) && buySources.length > 0
        ? Array.from(
            new Set(
              buySources
                .map((v) => String(v || "").trim().toLowerCase())
                .filter(Boolean)
                .map((v) => (v === "buffmarket" ? "buff" : v))
                .filter((v) => v === "csfloat" || v === "skinport" || v === "buff")
            )
          ).sort()
        : null
  });
  const cached = bestFlipsCache.get(cacheKey) || null;
  if (cached && Array.isArray(cached.data) && cached.data.length > 0 && now - cached.at < CACHE_MS) {
    return {
      flips: cached.data.map((flip) => ({ ...flip, dataStatus: "cached" })),
      isCached: true,
      lastUpdated: cached.at,
      rateLimited: false,
      scanMeta: cached.scanMeta || null
    };
  }

  try {
    const csfloatScanLimitRaw = Number(process.env.BEST_FLIPS_CSFLOAT_SCAN_LIMIT || 50);
    const csfloatScanLimit = Math.min(
      50,
      Math.max(1, Number.isFinite(csfloatScanLimitRaw) ? csfloatScanLimitRaw : 50)
    );
    const csfloatPagesRaw = Number(process.env.BEST_FLIPS_CSFLOAT_PAGES || 3);
    const csfloatPages = Math.min(
      8,
      Math.max(1, Number.isFinite(csfloatPagesRaw) ? Math.round(csfloatPagesRaw) : 3)
    );
    const maxUniqueRaw = Number(process.env.BEST_FLIPS_MAX_UNIQUE || 120);
    const maxUnique = Math.min(
      250,
      Math.max(10, Number.isFinite(maxUniqueRaw) ? Math.round(maxUniqueRaw) : 120)
    );
    const perItemMaxRaw = Number(process.env.BEST_FLIPS_CSFLOAT_PER_ITEM_MAX || 5);
    const perItemMax = Math.min(
      30,
      Math.max(0, Number.isFinite(perItemMaxRaw) ? Math.round(perItemMaxRaw) : 10)
    );
    const minSales7d = Number(process.env.BEST_FLIPS_MIN_SALES_7D || 0);

    const buySourcesSet =
      Array.isArray(buySources) && buySources.length > 0
        ? new Set(
            buySources
              .map((v) => String(v || "").trim().toLowerCase())
              .filter(Boolean)
              .map((v) => (v === "buffmarket" ? "buff" : v))
              .filter((v) => v === "csfloat" || v === "skinport" || v === "buff")
          )
        : null;

    const debug = String(process.env.BEST_FLIPS_DEBUG || "").trim() === "1";

    const csfloatApiKey = String(process.env.CSFLOAT_API_KEY || "").trim();
    const buffmarketCookie = String(process.env.BUFFMARKET_COOKIE || "").trim();
    const enableSkinportBuy = !buySourcesSet || buySourcesSet.has("skinport");
    const enableCsfloatBuy =
      Boolean(csfloatApiKey) && (!buySourcesSet || buySourcesSet.has("csfloat"));
    const enableBuffmarketBuy =
      Boolean(buffmarketCookie) && (!buySourcesSet || buySourcesSet.has("buff"));
    const scanMeta = {
      enabledSources: [
        enableSkinportBuy ? "Skinport" : null,
        enableCsfloatBuy ? "CSFloat" : null,
        enableBuffmarketBuy ? "BUFF Market" : null
      ].filter(Boolean),
      disabledSources: [
        !enableCsfloatBuy ? "CSFloat missing API key" : null,
        !enableBuffmarketBuy ? "BUFF Market missing cookie" : null
      ].filter(Boolean),
      counts: {
        skinportItems: 0,
        csfloatListings: 0,
        scannedItems: 0,
        salesHistoryRows: 0,
        itemsWithSales: 0,
        candidateRows: 0,
        opportunities: 0
      },
      filteredReasons: []
    };

    const debugCounts = debug ? new Map() : null;
    const debugHit = (key) => {
      if (!debugCounts) return;
      debugCounts.set(key, (debugCounts.get(key) || 0) + 1);
    };

    let csfloatPerItemFetches = 0;
    const bestNear = debug ? [] : null;
    const recordNear = (row) => {
      if (!bestNear) return;
      bestNear.push(row);
      bestNear.sort((a, b) => b.quickProfit - a.quickProfit);
      if (bestNear.length > 10) bestNear.length = 10;
    };

    const skinportItemsPromise = fetchSkinportItems({ appId: 730, currency: "USD", tradable: 1 });
    const csfloatBestDealBuyByName = new Map();
    let csfloatRows = [];
    let rateLimitedHit = false;
    const scanSortBy = maxBuyCents ? "lowest_price" : "best_deal";

    if (enableCsfloatBuy) {
      let cursor = null;
      for (let page = 0; page < csfloatPages; page += 1) {
        const respWrap = await fetchCsfloatListingsCached({
          limit: csfloatScanLimit,
          sortBy: scanSortBy,
          type: "buy_now",
          cursor: cursor || undefined
        });

        if (respWrap?.meta?.rateLimited) rateLimitedHit = true;
        const resp = respWrap?.data || null;
        const rows = Array.isArray(resp?.data) ? resp.data : [];
        csfloatRows = csfloatRows.concat(rows);

        for (const row of rows) {
          const name = row?.item?.market_hash_name;
          const priceCents = Number(row?.price);
          if (typeof name !== "string" || !name) continue;
          if (!Number.isFinite(priceCents) || priceCents <= 0) continue;
          if (maxBuyCents && priceCents > maxBuyCents) {
            // When scanning `lowest_price` we can stop early once we exceed budget.
            if (scanSortBy === "lowest_price") {
              cursor = null;
              break;
            }
            continue;
          }

          const prev = csfloatBestDealBuyByName.get(name);
          if (prev === undefined || priceCents < prev)
            csfloatBestDealBuyByName.set(name, priceCents);
          if (csfloatBestDealBuyByName.size >= maxUnique) break;
        }

        if (csfloatBestDealBuyByName.size >= maxUnique) break;

        const next =
          resp && typeof resp === "object" && "cursor" in resp ? String(resp.cursor || "") : "";
        cursor = next.trim() ? next.trim() : null;
        if (!cursor) break;
      }
    }

    const skinportItemsWrap = await skinportItemsPromise;
    if (skinportItemsWrap?.meta?.rateLimited) rateLimitedHit = true;
    const skinportItems = Array.isArray(skinportItemsWrap?.data) ? skinportItemsWrap.data : [];
    if (skinportItemsWrap?.meta?.rateLimited && skinportItems.length === 0) {
      scanMeta.disabledSources.push("Skinport items rate limited");
    }
    scanMeta.counts.skinportItems = skinportItems.length;
    scanMeta.counts.csfloatListings = csfloatRows.length;

  const itemsByName = new Map();
  for (const it of Array.isArray(skinportItems) ? skinportItems : []) {
    const name = it?.market_hash_name;
    if (typeof name !== "string" || !name) continue;
    itemsByName.set(name, it);
  }

  const skinportMarketHashNames = skinportItems
    .map((it) => (it && typeof it === "object" ? it.market_hash_name : null))
    .filter((n) => typeof n === "string" && n.trim());
  const marketHashNames = Array.from(
    new Set([...skinportMarketHashNames, ...Array.from(csfloatBestDealBuyByName.keys())])
  ).slice(0, maxUnique);
  scanMeta.counts.scannedItems = marketHashNames.length;
  const skinportSalesHistory = [];
  const salesHistoryMetaByName = new Map();
  for (let i = 0; i < marketHashNames.length; i += 50) {
    const chunk = marketHashNames.slice(i, i + 50);
    const partWrap = await fetchSkinportSalesHistory({
      appId: 730,
      currency: "USD",
      marketHashNames: chunk
    });
    if (partWrap?.meta?.rateLimited) rateLimitedHit = true;
    for (const chunkName of chunk) {
      salesHistoryMetaByName.set(chunkName, {
        lastUpdated: partWrap?.meta?.lastUpdated ?? null,
        isCached: Boolean(partWrap?.meta?.isCached || partWrap?.meta?.rateLimited)
      });
    }
    const part = Array.isArray(partWrap?.data) ? partWrap.data : [];
    skinportSalesHistory.push(...part);
  }
  scanMeta.counts.salesHistoryRows = skinportSalesHistory.length;
  if (rateLimitedHit && skinportSalesHistory.length === 0) {
    scanMeta.disabledSources.push("Skinport sales history rate limited");
  }
  if (debug) {
    console.log("[best-flips] items:", itemsByName.size);
    console.log("[best-flips] csfloatListings:", csfloatRows.length);
    console.log("[best-flips] csfloatUniqueItems:", marketHashNames.length);
    console.log("[best-flips] salesHistoryRequest:", marketHashNames.length);
    console.log(
      "[best-flips] salesHistoryResponse:",
      Array.isArray(skinportSalesHistory) ? skinportSalesHistory.length : 0
    );
  }

  const salesRowsByName = new Map();
  for (const row of Array.isArray(skinportSalesHistory) ? skinportSalesHistory : []) {
    const name = row?.market_hash_name;
    if (typeof name !== "string" || !name) continue;
    if (!salesRowsByName.has(name)) salesRowsByName.set(name, []);
    salesRowsByName.get(name).push(row);
  }

  const salesByName = new Map();
  for (const [name, rows] of salesRowsByName.entries()) {
    const merged = mergeSalesHistoryRows(rows);
    if (merged) salesByName.set(name, merged);
  }
  scanMeta.counts.itemsWithSales = salesByName.size;

  const out = [];
  const addCandidateDeals = ({ row, buyCandidates, sellCandidates, onlySource = null }) => {
    const validBuyCandidates = buyCandidates.filter(
      (candidate) => Number.isFinite(Number(candidate?.cents)) && Number(candidate.cents) > 0
    );
    const validSellCandidates = sellCandidates.filter(
      (candidate) => Number.isFinite(Number(candidate?.cents)) && Number(candidate.cents) > 0
    );

    for (const buy of validBuyCandidates) {
      for (const sell of validSellCandidates) {
        if (onlySource && buy.source !== onlySource && sell.source !== onlySource) continue;

        const { feeRate } = feeConfigForSellSource(sell.source, sell.cents);
        const deal = buildOpportunity({
          name: row.name,
          buyCents: buy.cents,
          sellCents: sell.cents,
          sellFeeRate: feeRate,
          maxBuyCents,
          minProfitCents: requiredMinProfitCents,
          minProfitPercent: requiredMinProfitPercent,
          includeLowLiquidity: includeLow,
          minLiquidity: requiredMinLiquidity,
          listingCount: row.listingCount,
          sourceBuy: buy.source,
          sourceSell: sell.source,
          salesLast7d: row.sales7d,
          salesLast30d: row.sales30d,
          stabilityScore: row.stabilityScore,
          sellWindow: sell.sellWindow,
          priceLastUpdated: buy.lastUpdated ?? null,
          salesDataLastUpdated: sell.lastUpdated ?? null,
          sourceDataCached: Boolean(buy.isCached || sell.isCached),
          debugSink: debug ? (reason) => debugHit(`${buy.source}->${sell.source}:${reason}`) : undefined
        });
        if (deal) out.push(deal);
      }
    }
  };

  const perItemQueue = [];
  const queuedNames = new Set();
  for (const [name, stats] of salesByName.entries()) {
    const pickedSell = pickSellFromSalesStats(stats);
    if (!pickedSell) continue;

    const sales7d = Number(pickedSell.salesLast7d) || 0;
    const sales30d = Number(pickedSell.salesLast30d) || 0;
    if (sales7d < minSales7d) continue;

    const item = itemsByName.get(name) || null;

    const sellCents = toUsdCents(pickedSell.sellUsd);
    if (!sellCents || sellCents <= 0) continue;

    const stabilityScore = stabilityScoreFromSalesStats(stats);
    const listingCount = item ? Number(item.quantity ?? 0) : 0;
    const salesMeta = salesHistoryMetaByName.get(name) || null;
    const salesDataLastUpdated = salesMeta?.lastUpdated ?? null;
    const salesDataCached = Boolean(salesMeta?.isCached);
    const skinportBuyCents = item ? toCentsFromUsdFloat(item.min_price) : null;
    const csfloatQuickCents = enableCsfloatBuy ? csfloatBestDealBuyByName.get(name) : null;
    const hasCsfloatQuick =
      Number.isFinite(Number(csfloatQuickCents)) && Number(csfloatQuickCents) > 0;

    const buyCandidates = [];
    const sellCandidates = [
      {
        source: "Skinport",
        cents: sellCents,
        lastUpdated: salesDataLastUpdated,
        isCached: salesDataCached,
        sellWindow: pickedSell.sourceWindow
      }
    ];

    if (enableSkinportBuy) {
      buyCandidates.push({
        source: "Skinport",
        cents: skinportBuyCents,
        lastUpdated: skinportItemsWrap?.meta?.lastUpdated ?? null,
        isCached: Boolean(skinportItemsWrap?.meta?.isCached || skinportItemsWrap?.meta?.rateLimited)
      });
    }

    if (hasCsfloatQuick) {
      const csfloatCandidate = {
        source: "CSFloat",
        cents: Number(csfloatQuickCents),
        lastUpdated: null,
        isCached: false
      };
      buyCandidates.push(csfloatCandidate);
      sellCandidates.push(csfloatCandidate);
    }

    addCandidateDeals({ row: { name, listingCount, sales7d, sales30d, stabilityScore }, buyCandidates, sellCandidates });

    let quickProfit = 0;
    if (hasCsfloatQuick) {
      const quickBuyCents = Number(csfloatQuickCents);
      if (maxBuyCents && Number(quickBuyCents) > Number(maxBuyCents)) {
        if (debug) debugHit("CSFloat->Skinport:buy_gt_budget");
      }

      // Pre-filter: only bother fetching per-item lowest listings if there's a chance it passes profit filters.
      const quickNetSell =
        sellCents - feeCents(sellCents, skinportSellFeeRateForSellCents(sellCents), "ceil");
      quickProfit = quickNetSell - Number(quickBuyCents);
      if (debug) {
        recordNear({
          name,
          sellWindow: pickedSell.sourceWindow,
          sales7d,
          quickBuy: Number(quickBuyCents) / 100,
          sell: sellCents / 100,
          netSell: quickNetSell / 100,
          quickProfit: quickProfit / 100
        });
      }
      if (quickProfit <= 0) {
        if (debug) debugHit("CSFloat->Skinport:profit_non_positive");
      }
    }

    perItemQueue.push({
      name,
      stats,
      pickedSell,
      sellCents,
      listingCount,
      sales7d,
      sales30d,
      stabilityScore,
      skinportBuyCents,
      csfloatQuickCents: hasCsfloatQuick ? Number(csfloatQuickCents) : null,
      salesDataLastUpdated,
      salesDataCached,
      quickProfit
    });
    queuedNames.add(name);
  }

  for (const [name, csfloatQuickCents] of csfloatBestDealBuyByName.entries()) {
    if (queuedNames.has(name)) continue;
    perItemQueue.push({
      name,
      stats: null,
      pickedSell: { sourceWindow: "live" },
      sellCents: null,
      listingCount: 0,
      sales7d: 0,
      sales30d: 0,
      stabilityScore: 0.6,
      skinportBuyCents: null,
      csfloatQuickCents: Number(csfloatQuickCents),
      salesDataLastUpdated: null,
      salesDataCached: false,
      quickProfit: 0
    });
    queuedNames.add(name);
  }
  scanMeta.counts.candidateRows = perItemQueue.length;

  perItemQueue.sort((a, b) => {
    if (enableCsfloatBuy) return b.quickProfit - a.quickProfit;
    return (Number(b.sales7d) || 0) - (Number(a.sales7d) || 0) || b.sellCents - a.sellCents;
  });
  const toFetch = perItemMax > 0 ? perItemQueue.slice(0, perItemMax) : [];
  const buffPerItemMaxRaw = Number(process.env.BEST_FLIPS_BUFFMARKET_PER_ITEM_MAX || maxUnique);
  const buffPerItemMax = Math.min(
    maxUnique,
    Math.max(0, Number.isFinite(buffPerItemMaxRaw) ? Math.round(buffPerItemMaxRaw) : maxUnique)
  );
  const buffToFetch =
    enableBuffmarketBuy && buffPerItemMax > 0 ? perItemQueue.slice(0, buffPerItemMax) : [];

  let buffmarketFetchErrors = 0;
  for (const row of buffToFetch) {
    const name = row.name;

    let buffGoods = null;
    let buffmarketMeta = null;
    try {
      const wrap = await fetchBuffmarketGoodsSearchCached({
        search: name,
        pageNum: 1,
        pageSize: 20
      });
      buffGoods = wrap?.data || null;
      buffmarketMeta = wrap?.meta || null;
    } catch (e) {
      buffGoods = null;
      buffmarketFetchErrors += 1;
      if (buffmarketFetchErrors === 1) {
        scanMeta.disabledSources.push("BUFF Market fetch/login failed");
      }
      if (debug && buffmarketFetchErrors <= 3) {
        const msg = e && typeof e === "object" && "message" in e ? String(e.message) : String(e || "");
        console.warn("[buffmarket] fetch error:", msg.slice(0, 200));
      }
      buffGoods = null;
    }

    const items = buffGoods && typeof buffGoods === "object" && "items" in buffGoods ? buffGoods.items : [];
    const match = (Array.isArray(items) ? items : []).find(
      (it) => String(it?.market_hash_name || "") === String(name)
    );
    const buffBuyCents = pickBuffmarketBuyCentsFromGoodsRow(match);

    const buyCandidates = [];
    const sellCandidates = [];

    if (Number.isFinite(Number(row.sellCents)) && Number(row.sellCents) > 0) {
      sellCandidates.push({
        source: "Skinport",
        cents: row.sellCents,
        lastUpdated: row.salesDataLastUpdated,
        isCached: row.salesDataCached,
        sellWindow: row.pickedSell.sourceWindow
      });
    }

    if (enableSkinportBuy) {
      buyCandidates.push({
        source: "Skinport",
        cents: row.skinportBuyCents,
        lastUpdated: skinportItemsWrap?.meta?.lastUpdated ?? null,
        isCached: Boolean(skinportItemsWrap?.meta?.isCached || skinportItemsWrap?.meta?.rateLimited)
      });
    }

    if (Number.isFinite(Number(row.csfloatQuickCents)) && Number(row.csfloatQuickCents) > 0) {
      const csfloatCandidate = {
        source: "CSFloat",
        cents: Number(row.csfloatQuickCents),
        lastUpdated: null,
        isCached: false
      };
      buyCandidates.push(csfloatCandidate);
      sellCandidates.push(csfloatCandidate);
    }

    if (Number.isFinite(Number(buffBuyCents)) && Number(buffBuyCents) > 0) {
      const buffCandidate = {
        source: "BUFF Market",
        cents: Number(buffBuyCents),
        lastUpdated: buffmarketMeta?.lastUpdated ?? null,
        isCached: Boolean(buffmarketMeta?.isCached || buffmarketMeta?.rateLimited)
      };
      buyCandidates.push(buffCandidate);
      sellCandidates.push(buffCandidate);
    }

    addCandidateDeals({ row, buyCandidates, sellCandidates, onlySource: "BUFF Market" });
  }

  if (debug) {
    console.log("[best-flips] opportunities:", out.length);
    console.log("[best-flips] csfloatPerItemFetches:", csfloatPerItemFetches);
    if (debugCounts) {
      const rows = Array.from(debugCounts.entries()).sort((a, b) => b[1] - a[1]);
      scanMeta.filteredReasons = rows.slice(0, 20).map(([reason, count]) => ({ reason, count }));
      console.log("[best-flips] filtered_reasons:", JSON.stringify(rows.slice(0, 20)));
    }
    if (bestNear && bestNear.length > 0) {
      console.log("[best-flips] top_near_misses:", JSON.stringify(bestNear, null, 2));
    }
  }

  out.sort((x, y) => {
    const rankX = Number(x.profit) * Number(x.confidence);
    const rankY = Number(y.profit) * Number(y.confidence);
    if (rankY !== rankX) return rankY - rankX;
    if (y.profit !== x.profit) return y.profit - x.profit;
    return y.confidence - x.confidence;
  });
  const sliced = out;
  scanMeta.counts.opportunities = sliced.length;

  if (rateLimitedHit) {
    if (cached && cached.data) {
      return {
        flips: cached.data.map((flip) => ({ ...flip, dataStatus: "cached" })),
        isCached: true,
        lastUpdated: cached.at,
        rateLimited: true,
        scanMeta: cached.scanMeta || scanMeta
      };
    }

    // Don't overwrite the cache with an empty response if we're rate-limited.
    if (sliced.length === 0) {
      return { flips: [], isCached: false, lastUpdated: null, rateLimited: true, scanMeta };
    }
  }

  if (sliced.length > 0) {
    bestFlipsCache.set(cacheKey, { at: now, data: sliced, scanMeta });
  }
  return { flips: sliced, isCached: false, lastUpdated: now, rateLimited: false, scanMeta };
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "";
    const is429 =
      msg.includes("HTTP 429") ||
      msg.toLowerCase().includes("too many requests") ||
      msg.toLowerCase().includes("rate limited");

    if (cached && cached.data)
      return {
        flips: cached.data.map((flip) => ({ ...flip, dataStatus: "cached" })),
        isCached: true,
        lastUpdated: cached.at,
        rateLimited: is429,
        scanMeta: cached.scanMeta || null
      };
    if (is429) return { flips: [], isCached: false, lastUpdated: null, rateLimited: true };
    throw e;
  }
}
