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
  salesLast7d,
  salesLast30d,
  stabilityScore,
  sellWindow,
  debugSink
}) {
  const debug = typeof debugSink === "function" ? debugSink : null;
  if (!buyCents || !sellCents || buyCents <= 0 || sellCents <= 0) return null;
  if (maxBuyCents && Number(buyCents) > Number(maxBuyCents)) {
    if (debug) debug("buy_gt_budget");
    return null;
  }

  const netSellCents = sellCents - feeCents(sellCents, sellFeeRate, "ceil");
  const profitCents = netSellCents - buyCents;
  if (profitCents <= 0) {
    if (debug) debug("profit_non_positive");
    return null;
  }

  const profitPercent = (profitCents / buyCents) * 100;
  const requiredProfitPercent =
    Number.isFinite(Number(minProfitPercent)) && Number(minProfitPercent) > 0
      ? Number(minProfitPercent)
      : 5;
  if (profitPercent < requiredProfitPercent) {
    if (debug) debug(`profit_percent_lt_${requiredProfitPercent}`);
    return null;
  }
  const requiredProfitCents =
    Number.isFinite(Number(minProfitCents)) && Number(minProfitCents) > 0
      ? Number(minProfitCents)
      : 200;
  if (profitCents < requiredProfitCents) {
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
    stabilityScore: Number.isFinite(Number(stabilityScore)) ? Number(stabilityScore) : undefined
  };
}

function feeConfigForSellSource(source, sellCents) {
  const s = String(source || "").toLowerCase();
  if (s.includes("csfloat")) return { feeRate: 0.02, mode: "ceil" };
  if (s.includes("skinport"))
    return { feeRate: skinportSellFeeRateForSellCents(sellCents), mode: "ceil" };
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

export async function getBestFlipsReal({
  maxBuyPrice,
  minProfitUsd,
  minProfitPercent,
  includeLowLiquidity
} = {}) {
  const now = Date.now();
  const maxBuyCents = toOptionalUsdCents(maxBuyPrice);
  const includeLow = toOptionalBool(includeLowLiquidity) === true;
  const requestedMinProfitCents = toOptionalUsdCents(minProfitUsd);
  const requiredMinProfitCents =
    requestedMinProfitCents ?? (maxBuyCents ? minProfitCentsFromBudget(maxBuyCents) : 200);
  const requiredMinProfitPercent = toOptionalPercent(minProfitPercent) ?? 5;

  const cacheKey = JSON.stringify({
    maxBuyCents: maxBuyCents || null,
    minProfitCents: requiredMinProfitCents,
    minProfitPercent: requiredMinProfitPercent,
    includeLowLiquidity: includeLow
  });
  const cached = bestFlipsCache.get(cacheKey) || null;
  if (cached && cached.data && now - cached.at < CACHE_MS) {
    return { flips: cached.data, isCached: false, lastUpdated: cached.at };
  }

  try {
    const limit = Number(process.env.BEST_FLIPS_LIMIT || 50);
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

    const enableSkinportBuy = String(process.env.BEST_FLIPS_ENABLE_SKINPORT_BUY || "0") !== "0";
    const enableCsfloatBuy = String(process.env.BEST_FLIPS_ENABLE_CSFLOAT_BUY || "1") !== "0";
    const debug = String(process.env.BEST_FLIPS_DEBUG || "").trim() === "1";

    const csfloatApiKey = String(process.env.CSFLOAT_API_KEY || "").trim();
    if (enableCsfloatBuy && !csfloatApiKey) {
      throw ApiError.badRequest("Missing CSFLOAT_API_KEY (needed to compute CSFloat buy prices)");
    }

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

  const itemsByName = new Map();
  for (const it of Array.isArray(skinportItems) ? skinportItems : []) {
    const name = it?.market_hash_name;
    if (typeof name !== "string" || !name) continue;
    itemsByName.set(name, it);
  }

  const marketHashNames = Array.from(csfloatBestDealBuyByName.keys());
  const skinportSalesHistory = [];
  for (let i = 0; i < marketHashNames.length; i += 50) {
    const chunk = marketHashNames.slice(i, i + 50);
    const partWrap = await fetchSkinportSalesHistory({
      appId: 730,
      currency: "USD",
      marketHashNames: chunk
    });
    if (partWrap?.meta?.rateLimited) rateLimitedHit = true;
    const part = Array.isArray(partWrap?.data) ? partWrap.data : [];
    skinportSalesHistory.push(...part);
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

    const out = [];
  const perItemQueue = [];
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

    if (enableSkinportBuy) {
      const skinportBuyCents = item ? toCentsFromUsdFloat(item.min_price) : null;
      const skinportDeal = buildOpportunity({
        name,
        buyCents: skinportBuyCents,
        sellCents,
        sellFeeRate: skinportSellFeeRateForSellCents(sellCents),
        maxBuyCents,
        minProfitCents: requiredMinProfitCents,
        minProfitPercent: requiredMinProfitPercent,
        includeLowLiquidity: includeLow,
        listingCount,
        sourceBuy: "Skinport",
        sourceSell: "Skinport",
        salesLast7d: sales7d,
        salesLast30d: sales30d,
        stabilityScore,
        sellWindow: pickedSell.sourceWindow,
        debugSink: debug ? (reason) => debugHit(`Skinport->Skinport:${reason}`) : undefined
      });
      if (skinportDeal) out.push(skinportDeal);
    }

    if (!enableCsfloatBuy) continue;

    const quickBuyCents = csfloatBestDealBuyByName.get(name);
    if (!Number.isFinite(Number(quickBuyCents)) || Number(quickBuyCents) <= 0) continue;
    if (maxBuyCents && Number(quickBuyCents) > Number(maxBuyCents)) {
      if (debug) debugHit("CSFloat->Skinport:buy_gt_budget");
      continue;
    }

    // Pre-filter: only bother fetching per-item lowest listings if there's a chance it passes profit filters.
    const quickNetSell = sellCents - feeCents(sellCents, skinportSellFeeRateForSellCents(sellCents), "ceil");
    const quickProfit = quickNetSell - Number(quickBuyCents);
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
      continue;
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
      quickProfit
    });
  }

  perItemQueue.sort((a, b) => b.quickProfit - a.quickProfit);
  const toFetch = perItemMax > 0 ? perItemQueue.slice(0, perItemMax) : [];

  for (const row of toFetch) {
    const name = row.name;

    // Fetch actual lowest 1–3 listings for buyPrice.
    let perItemListings = null;
    try {
      csfloatPerItemFetches += 1;
      const perItemWrap = await fetchCsfloatListingsCached({
        limit: 5,
        sortBy: "lowest_price",
        type: "buy_now",
        marketHashName: name
      });
      if (perItemWrap?.meta?.rateLimited) rateLimitedHit = true;
      perItemListings = perItemWrap?.data || null;
    } catch {
      perItemListings = null;
    }

    const csfloatPrices = (Array.isArray(perItemListings?.data) ? perItemListings.data : [])
      .map((r) => Number(r?.price))
      .filter((v) => Number.isFinite(v) && v > 0);

    const csfloatBuyCents = csfloatPrices.length > 0 ? Math.min(...csfloatPrices) : null;
    const csfloatDeal = buildOpportunity({
      name,
      buyCents: csfloatBuyCents,
      sellCents: row.sellCents,
      sellFeeRate: skinportSellFeeRateForSellCents(row.sellCents),
      maxBuyCents,
      minProfitCents: requiredMinProfitCents,
      minProfitPercent: requiredMinProfitPercent,
      includeLowLiquidity: includeLow,
      listingCount: row.listingCount,
      sourceBuy: "CSFloat",
      sourceSell: "Skinport",
      salesLast7d: row.sales7d,
      salesLast30d: row.sales30d,
      stabilityScore: row.stabilityScore,
      sellWindow: row.pickedSell.sourceWindow,
      debugSink: debug ? (reason) => debugHit(`CSFloat->Skinport:${reason}`) : undefined
    });
    if (csfloatDeal) out.push(csfloatDeal);
  }
  if (debug) {
    console.log("[best-flips] opportunities:", out.length);
    console.log("[best-flips] csfloatPerItemFetches:", csfloatPerItemFetches);
    if (debugCounts) {
      const rows = Array.from(debugCounts.entries()).sort((a, b) => b[1] - a[1]);
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
  const sliced = out.slice(0, Number.isFinite(limit) ? limit : 50);

  if (rateLimitedHit && cached && cached.data) {
    return { flips: cached.data, isCached: true, lastUpdated: cached.at };
  }

  bestFlipsCache.set(cacheKey, { at: now, data: sliced });
  return { flips: sliced, isCached: false, lastUpdated: now };
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "";
    const is429 =
      msg.includes("HTTP 429") ||
      msg.toLowerCase().includes("too many requests") ||
      msg.toLowerCase().includes("rate limited");

    if (cached && cached.data) return { flips: cached.data, isCached: true, lastUpdated: cached.at };
    if (is429) return { flips: [], isCached: true, lastUpdated: null };
    throw e;
  }
}
