import { ApiError } from "../../shared/errors/ApiError.js";
import { getConfig } from "../../config/env.js";
import { fetchSkinportItems, fetchSkinportSalesHistory } from "../flips/skinport.client.js";
import { fetchCsfloatListings } from "../flips/csfloat.client.js";
import {
  fetchBuffmarketGoodsSearch,
  pickBuffmarketBuyCentsFromGoodsRow
} from "../flips/buffmarket.client.js";
import {
  getInventoryByUserId,
  insertInventoryItem,
  deleteInventoryItemById
} from "./inventory.repository.js";

function asPositiveNumber(value, name) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw ApiError.badRequest(`${name} must be a positive number`);
  }
  return numberValue;
}

function asNonNegativeNumber(value, name) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw ApiError.badRequest(`${name} must be a non-negative number`);
  }
  return numberValue;
}

function asPositiveInteger(value, name) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw ApiError.badRequest(`${name} must be a positive integer`);
  }
  return numberValue;
}

function envBool(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = String(raw).trim().toLowerCase();
  if (value === "1" || value === "true" || value === "yes") return true;
  if (value === "0" || value === "false" || value === "no") return false;
  return fallback;
}

function envRate(name, fallback) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return fallback;
  if (n <= 0 || n >= 1) return fallback;
  return n;
}

function envPositiveInteger(name, fallback, { min = 1, max = 500 } = {}) {
  const n = Number(process.env[name]);
  if (!Number.isInteger(n) || n < min) return fallback;
  return Math.min(max, n);
}

function envUsdThresholdToCents(name, fallbackUsd = 0) {
  const raw = process.env[name];
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return Math.round(Number(fallbackUsd) * 100);
  return Math.round(n * 100);
}

function toUsdCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function feeCents(sellCents, feeRate, mode = "ceil") {
  if (!feeRate) return 0;
  const raw =
    mode === "round" ? Math.round(Number(sellCents) * Number(feeRate)) : Math.ceil(Number(sellCents) * Number(feeRate));
  return Math.max(1, raw);
}

function skinportSellFeeRateForSellCents(sellCents) {
  const standard = envRate("SKINPORT_FEE_STANDARD", 0.08);
  const highTier = envRate("SKINPORT_FEE_HIGH_TIER", 0.06);
  const thresholdCents = envUsdThresholdToCents("SKINPORT_HIGH_TIER_THRESHOLD_USD", 0);

  if (thresholdCents > 0 && Number(sellCents) >= thresholdCents) return highTier;
  return standard;
}

function feeConfigForSellSource(source, sellCents) {
  const s = String(source || "").toLowerCase();
  if (s.includes("csfloat")) return { feeRate: 0.02, mode: "ceil" };
  if (s.includes("skinport")) {
    return { feeRate: skinportSellFeeRateForSellCents(sellCents), mode: "ceil" };
  }
  if (s.includes("buff")) return { feeRate: envRate("BUFFMARKET_FEE_RATE", 0.025), mode: "ceil" };
  return { feeRate: 0, mode: "ceil" };
}

function chunk(items, size) {
  const out = [];
  const safeSize = Math.max(1, Math.floor(Number(size) || 1));
  for (let index = 0; index < items.length; index += safeSize) {
    out.push(items.slice(index, index + safeSize));
  }
  return out;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const safeItems = Array.isArray(items) ? items : [];
  const safeConcurrency = Math.max(1, Math.floor(Number(concurrency) || 1));
  const results = new Array(safeItems.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < safeItems.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(safeItems[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(safeConcurrency, safeItems.length) }, () => worker()));
  return results;
}

function pickSellFromSalesStats(stats) {
  const safeStats = stats && typeof stats === "object" ? stats : null;
  if (!safeStats) return null;

  const windows = [
    ["7d", safeStats.last_7_days],
    ["30d", safeStats.last_30_days],
    ["90d", safeStats.last_90_days]
  ];

  for (const [label, window] of windows) {
    const median = Number(window?.median);
    const volume = Number(window?.volume);
    if (Number.isFinite(median) && median > 0 && Number.isFinite(volume) && volume > 0) {
      return {
        sellUsd: median,
        reference: `${label} median sale`,
        volume
      };
    }
  }

  return null;
}

function scoreSalesWindow(stats, windowKey) {
  const window = stats && typeof stats === "object" ? stats[windowKey] : null;
  const volume = Number(window?.volume);
  const median = Number(window?.median);
  return {
    volume: Number.isFinite(volume) ? volume : 0,
    median: Number.isFinite(median) ? median : null
  };
}

function bestRowForWindow(rows, windowKey) {
  let best = null;
  let bestVolume = -1;
  let bestMedian = -1;

  for (const row of Array.isArray(rows) ? rows : []) {
    const { volume, median } = scoreSalesWindow(row, windowKey);
    if (!median || volume <= 0) continue;

    if (volume > bestVolume || (volume === bestVolume && Number(median) > bestMedian)) {
      best = row;
      bestVolume = volume;
      bestMedian = Number(median);
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
    last_7_days: best7?.last_7_days ?? { median: null, volume: 0 },
    last_30_days: best30?.last_30_days ?? { median: null, volume: 0 },
    last_90_days: best90?.last_90_days ?? { median: null, volume: 0 }
  };
}

function pickSkinportListingUsd(row) {
  const candidates = [
    Number(row?.suggested_price),
    Number(row?.min_price),
    Number(row?.avg_price),
    Number(row?.median_price)
  ].filter((value) => Number.isFinite(value) && value > 0);

  return candidates[0] ?? null;
}

function createMarketplaceOffer({
  marketplace,
  sellPriceUsd,
  reference,
  volume,
  isCached,
  rateLimited,
  url
}) {
  const sellCents = toUsdCents(sellPriceUsd);
  if (!sellCents) return null;

  const { feeRate, mode } = feeConfigForSellSource(marketplace, sellCents);
  const fee = feeCents(sellCents, feeRate, mode);
  const netSellCents = sellCents - fee;

  return {
    marketplace,
    price: sellCents / 100,
    netPrice: netSellCents / 100,
    feeRate,
    fee: fee / 100,
    reference: reference || "market price",
    volume: Number.isFinite(Number(volume)) ? Number(volume) : null,
    isCached: Boolean(isCached),
    rateLimited: Boolean(rateLimited),
    url: url || null
  };
}

function sortOffers(a, b) {
  const grossDiff = Number(b?.price || 0) - Number(a?.price || 0);
  if (grossDiff !== 0) return grossDiff;
  const netDiff = Number(b?.netPrice || 0) - Number(a?.netPrice || 0);
  if (netDiff !== 0) return netDiff;
  return String(a?.marketplace || "").localeCompare(String(b?.marketplace || ""));
}

function getSteamItemSellStatus({ item, pricing }) {
  const markets = Array.isArray(pricing?.markets) ? pricing.markets : [];
  const hasMarketData = markets.length > 0;

  if (!item?.tradable) {
    return {
      sellStatus: "not_tradable",
      sellReason: "Steam oznacza ten item jako non-tradable, wiec nie nadaje sie teraz do sprzedazy."
    };
  }

  if (!item?.marketable) {
    return {
      sellStatus: "not_marketable",
      sellReason: "Steam oznacza ten item jako non-marketable, wiec marketplace go nie wystawia."
    };
  }

  if (!item?.marketHashName) {
    return {
      sellStatus: "missing_name",
      sellReason: "Brakuje market hash name, wiec item nie zostal dopasowany do ofert marketplace."
    };
  }

  if (!hasMarketData) {
    return {
      sellStatus: "no_market_data",
      sellReason: "Nie znaleziono wiarygodnej ceny na aktywnych marketplace dla tego itemu."
    };
  }

  if (!pricing?.bestMarketplace || !pricing?.bestPrice) {
    return {
      sellStatus: "incomplete_market_data",
      sellReason: "Dane rynkowe sa niepelne, wiec nie da sie wskazac najlepszej ceny sprzedazy."
    };
  }

  return {
    sellStatus: "sellable",
    sellReason: `Najwyzsza obecnie cena sprzedazy jest na ${pricing.bestMarketplace}.`
  };
}

const csfloatExactCache = new Map();
const CSFLOAT_EXACT_CACHE_MS = 2 * 60_000;
let csfloatBlockedUntil = 0;
const CSFLOAT_RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;

function csfloatCacheKey(marketHashName) {
  return String(marketHashName || "").trim();
}

async function fetchCsfloatLowestListingCached(marketHashName) {
  const key = csfloatCacheKey(marketHashName);
  if (!key) return { priceUsd: null, isCached: false, rateLimited: false };

  const now = Date.now();
  const cached = csfloatExactCache.get(key) || null;
  if (cached && now - cached.at < CSFLOAT_EXACT_CACHE_MS) {
    return { ...cached.data, isCached: true, rateLimited: false };
  }

  if (now < csfloatBlockedUntil) {
    return cached
      ? { ...cached.data, isCached: true, rateLimited: true }
      : { priceUsd: null, isCached: false, rateLimited: true };
  }

  try {
    const response = await fetchCsfloatListings({
      marketHashName: key,
      limit: 1,
      sortBy: "lowest_price",
      type: "buy_now"
    });

    const row = Array.isArray(response?.data) ? response.data[0] : null;
    const priceCents = Number(row?.price);
    const data = {
      priceUsd: Number.isFinite(priceCents) && priceCents > 0 ? priceCents / 100 : null,
      isCached: false,
      rateLimited: false
    };
    csfloatExactCache.set(key, { at: now, data });
    return data;
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error ? String(error.message) : String(error || "");
    const isRateLimited =
      message.includes("HTTP 429") || message.toLowerCase().includes("too many requests");

    if (isRateLimited) {
      csfloatBlockedUntil = Date.now() + CSFLOAT_RATE_LIMIT_COOLDOWN_MS;
      return cached
        ? { ...cached.data, isCached: true, rateLimited: true }
        : { priceUsd: null, isCached: false, rateLimited: true };
    }

    return { priceUsd: null, isCached: false, rateLimited: false };
  }
}

const buffExactCache = new Map();
const BUFF_EXACT_CACHE_MS = 2 * 60_000;
let buffBlockedUntil = 0;
const BUFF_RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;
const BUFF_AUTH_COOLDOWN_MS = 30 * 60_000;

async function fetchBuffLowestListingCached(marketHashName) {
  const key = String(marketHashName || "").trim();
  if (!key) return { priceUsd: null, isCached: false, rateLimited: false, authRequired: false };

  const now = Date.now();
  const cached = buffExactCache.get(key) || null;
  if (cached && now - cached.at < BUFF_EXACT_CACHE_MS) {
    return { ...cached.data, isCached: true, rateLimited: false, authRequired: false };
  }

  if (now < buffBlockedUntil) {
    return cached
      ? { ...cached.data, isCached: true, rateLimited: true, authRequired: false }
      : { priceUsd: null, isCached: false, rateLimited: true, authRequired: false };
  }

  try {
    const response = await fetchBuffmarketGoodsSearch({
      search: key,
      pageNum: 1,
      pageSize: 20
    });
    const items = Array.isArray(response?.items) ? response.items : [];
    const match = items.find((item) => String(item?.market_hash_name || "") === key) || null;
    const priceCents = pickBuffmarketBuyCentsFromGoodsRow(match);
    const data = {
      priceUsd: priceCents ? priceCents / 100 : null,
      isCached: false,
      rateLimited: false
    };
    buffExactCache.set(key, { at: now, data });
    return { ...data, authRequired: false };
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error ? String(error.message) : String(error || "");
    const lower = message.toLowerCase();
    const isRateLimited = message.includes("HTTP 429") || lower.includes("too many requests") || lower.includes("rate limit");
    const isAuthRequired =
      lower.includes("login required") ||
      lower.includes("missing buffmarket_cookie") ||
      lower.includes("invalid buffmarket_cookie");

    if (isAuthRequired) {
      buffBlockedUntil = Date.now() + BUFF_AUTH_COOLDOWN_MS;
      return { priceUsd: null, isCached: false, rateLimited: false, authRequired: true };
    }

    if (isRateLimited) {
      buffBlockedUntil = Date.now() + BUFF_RATE_LIMIT_COOLDOWN_MS;
      return cached
        ? { ...cached.data, isCached: true, rateLimited: true, authRequired: false }
        : { priceUsd: null, isCached: false, rateLimited: true, authRequired: false };
    }

    return { priceUsd: null, isCached: false, rateLimited: false, authRequired: false };
  }
}

async function buildMarketplacePricing(items) {
  const uniqueMarketHashNames = Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => (typeof item?.marketHashName === "string" ? item.marketHashName.trim() : ""))
        .filter(Boolean)
    )
  );

  const maxUnique = envPositiveInteger("STEAM_INVENTORY_PRICING_MAX_UNIQUE", 120, {
    min: 1,
    max: 500
  });
  const concurrency = envPositiveInteger("STEAM_INVENTORY_PRICING_CONCURRENCY", 6, {
    min: 1,
    max: 20
  });
  const selectedNames = uniqueMarketHashNames.slice(0, maxUnique);
  const skippedUniqueNames = Math.max(0, uniqueMarketHashNames.length - selectedNames.length);

  const [skinportItemsWrap, skinportSalesResults] = await Promise.all([
    fetchSkinportItems({ appId: 730, currency: "USD", tradable: 1 }).catch(() => ({
      data: [],
      meta: { isCached: false, rateLimited: false, lastUpdated: null }
    })),
    (async () => {
      const rows = [];
      const metaByName = new Map();

      for (const namesChunk of chunk(selectedNames, 50)) {
        const partWrap = await fetchSkinportSalesHistory({
          appId: 730,
          currency: "USD",
          marketHashNames: namesChunk
        }).catch(() => ({
          data: [],
          meta: { isCached: false, rateLimited: false, lastUpdated: null }
        }));

        for (const name of namesChunk) {
          metaByName.set(name, {
            isCached: Boolean(partWrap?.meta?.isCached),
            rateLimited: Boolean(partWrap?.meta?.rateLimited)
          });
        }

        if (Array.isArray(partWrap?.data)) rows.push(...partWrap.data);
      }

      return { rows, metaByName };
    })()
  ]);

  const skinportItems = Array.isArray(skinportItemsWrap?.data) ? skinportItemsWrap.data : [];
  const skinportItemsByName = new Map();
  for (const row of skinportItems) {
    const name = typeof row?.market_hash_name === "string" ? row.market_hash_name.trim() : "";
    if (!name || skinportItemsByName.has(name)) continue;
    skinportItemsByName.set(name, row);
  }

  const salesRowsByName = new Map();
  for (const row of Array.isArray(skinportSalesResults.rows) ? skinportSalesResults.rows : []) {
    const name = typeof row?.market_hash_name === "string" ? row.market_hash_name.trim() : "";
    if (!name) continue;
    if (!salesRowsByName.has(name)) salesRowsByName.set(name, []);
    salesRowsByName.get(name).push(row);
  }

  const mergedSalesByName = new Map();
  for (const [name, rows] of salesRowsByName.entries()) {
    const merged = mergeSalesHistoryRows(rows);
    if (merged) mergedSalesByName.set(name, merged);
  }

  const csfloatEnabled = Boolean(String(process.env.CSFLOAT_API_KEY || "").trim());
  const buffEnabled =
    Boolean(String(process.env.BUFFMARKET_COOKIE || "").trim()) &&
    envBool("BEST_FLIPS_ENABLE_BUFFMARKET_BUY", false);

  const [csfloatResults, buffResults] = await Promise.all([
    csfloatEnabled
      ? mapWithConcurrency(selectedNames, concurrency, async (name) => ({
          name,
          result: await fetchCsfloatLowestListingCached(name)
        }))
      : Promise.resolve([]),
    buffEnabled
      ? mapWithConcurrency(selectedNames, concurrency, async (name) => ({
          name,
          result: await fetchBuffLowestListingCached(name)
        }))
      : Promise.resolve([])
  ]);

  const csfloatByName = new Map(csfloatResults.map((entry) => [entry.name, entry.result]));
  const buffByName = new Map(buffResults.map((entry) => [entry.name, entry.result]));

  const pricingByName = new Map();
  let pricedItems = 0;

  for (const name of selectedNames) {
    const offers = [];

    const skinportSales = pickSellFromSalesStats(mergedSalesByName.get(name));
    if (skinportSales) {
      const offer = createMarketplaceOffer({
        marketplace: "Skinport",
        sellPriceUsd: skinportSales.sellUsd,
        reference: skinportSales.reference,
        volume: skinportSales.volume,
        isCached: Boolean(skinportSalesResults.metaByName.get(name)?.isCached),
        rateLimited: Boolean(skinportSalesResults.metaByName.get(name)?.rateLimited),
        url: "https://skinport.com/market"
      });
      if (offer) offers.push(offer);
    } else {
      const skinportListing = pickSkinportListingUsd(skinportItemsByName.get(name));
      const offer = createMarketplaceOffer({
        marketplace: "Skinport",
        sellPriceUsd: skinportListing,
        reference: "lowest listing",
        isCached: Boolean(skinportItemsWrap?.meta?.isCached),
        rateLimited: Boolean(skinportItemsWrap?.meta?.rateLimited),
        url: "https://skinport.com/market"
      });
      if (offer) offers.push(offer);
    }

    if (csfloatEnabled) {
      const csfloat = csfloatByName.get(name) || null;
      const offer = createMarketplaceOffer({
        marketplace: "CSFloat",
        sellPriceUsd: csfloat?.priceUsd,
        reference: "lowest listing",
        isCached: Boolean(csfloat?.isCached),
        rateLimited: Boolean(csfloat?.rateLimited),
        url: "https://csfloat.com"
      });
      if (offer) offers.push(offer);
    }

    if (buffEnabled) {
      const buff = buffByName.get(name) || null;
      const offer = createMarketplaceOffer({
        marketplace: "BUFF Market",
        sellPriceUsd: buff?.priceUsd,
        reference: "lowest listing",
        isCached: Boolean(buff?.isCached),
        rateLimited: Boolean(buff?.rateLimited),
        url: "https://buff.market/market/csgo"
      });
      if (offer) offers.push(offer);
    }

    offers.sort(sortOffers);
    const bestOffer = offers[0] || null;
    if (bestOffer) pricedItems += 1;

    pricingByName.set(name, {
      bestMarketplace: bestOffer?.marketplace || null,
      bestPrice: bestOffer?.price || null,
      bestNetPrice: bestOffer?.netPrice || null,
      bestFeeRate: bestOffer?.feeRate ?? null,
      bestReference: bestOffer?.reference || null,
      markets: offers
    });
  }

  return {
    pricingByName,
    pricedItems,
    uniqueItemsProcessed: selectedNames.length,
    skippedUniqueNames,
    enabledMarketplaces: [
      "Skinport",
      csfloatEnabled ? "CSFloat" : null,
      buffEnabled ? "BUFF Market" : null
    ].filter(Boolean)
  };
}

export async function listInventory({ userId }) {
  const rows = await getInventoryByUserId(userId);
  return rows.map((row) => ({
    id: row.id,
    skin: row.skin,
    purchasePrice: Number(row.purchase_price),
    currentPrice: Number(row.current_price),
    quantity: Number(row.quantity),
    createdAt: row.created_at
  }));
}

export async function createInventoryItem({
  userId,
  skin,
  purchasePrice,
  currentPrice,
  quantity
}) {
  if (typeof skin !== "string" || !skin.trim()) {
    throw ApiError.badRequest("skin is required");
  }

  const purchase = asPositiveNumber(purchasePrice, "purchasePrice");
  const current = asNonNegativeNumber(currentPrice, "currentPrice");
  const qty = asPositiveInteger(quantity, "quantity");

  const row = await insertInventoryItem({
    userId,
    skin: skin.trim(),
    purchasePrice: purchase,
    currentPrice: current,
    quantity: qty
  });

  return {
    id: row.id,
    skin: row.skin,
    purchasePrice: Number(row.purchase_price),
    currentPrice: Number(row.current_price),
    quantity: Number(row.quantity),
    createdAt: row.created_at
  };
}

export async function removeInventoryItem({ userId, id }) {
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest("Invalid id");
  const deleted = await deleteInventoryItemById({ userId, id });
  if (!deleted) throw ApiError.notFound("Inventory item not found");
}

function ensureSteamUser(user) {
  if (!user?.steamId) {
    throw ApiError.badRequest("Steam account is not connected for this user");
  }
  return user.steamId;
}

function createSteamIconUrl(iconPath) {
  if (typeof iconPath !== "string" || !iconPath.trim()) return null;
  return `https://community.cloudflare.steamstatic.com/economy/image/${iconPath}`;
}

function simplifyTag(tag) {
  if (!tag || typeof tag !== "object") return null;
  const category = typeof tag.category === "string" ? tag.category : null;
  const internalName = typeof tag.internal_name === "string" ? tag.internal_name : null;
  const name = typeof tag.name === "string" ? tag.name : null;
  if (!category && !internalName && !name) return null;

  return {
    category,
    internalName,
    name
  };
}

function normalizeSteamInventoryItem(asset, description, context) {
  const safeDescription = description && typeof description === "object" ? description : {};
  const tags = Array.isArray(safeDescription.tags)
    ? safeDescription.tags.map(simplifyTag).filter(Boolean)
    : [];
  const rarityTag = tags.find((tag) => tag.category === "Rarity");
  const exteriorTag = tags.find((tag) => tag.category === "Exterior");
  const typeTag = tags.find((tag) => tag.category === "Type");

  return {
    assetId: String(asset.assetid ?? ""),
    classId: String(asset.classid ?? ""),
    instanceId: String(asset.instanceid ?? ""),
    amount: Number(asset.amount ?? 1),
    appId: Number(context.appId),
    contextId: String(context.contextId),
    name:
      (typeof safeDescription.name === "string" && safeDescription.name.trim()) ||
      (typeof safeDescription.market_name === "string" && safeDescription.market_name.trim()) ||
      "Unknown item",
    marketHashName:
      (typeof safeDescription.market_hash_name === "string" && safeDescription.market_hash_name.trim()) ||
      (typeof safeDescription.market_name === "string" && safeDescription.market_name.trim()) ||
      null,
    type:
      (typeof safeDescription.type === "string" && safeDescription.type.trim()) ||
      (typeTag?.name || null),
    tradable: Number(safeDescription.tradable ?? 0) === 1,
    marketable: Number(safeDescription.marketable ?? 0) === 1,
    commodity: Number(safeDescription.commodity ?? 0) === 1,
    iconUrl: createSteamIconUrl(safeDescription.icon_url_large ?? safeDescription.icon_url),
    rarity: rarityTag?.name || null,
    exterior: exteriorTag?.name || null,
    tags,
    source: "steam"
  };
}

async function fetchSteamInventoryPage({ steamId, appId, contextId, count, startAssetId }) {
  const url = new URL(`https://steamcommunity.com/inventory/${steamId}/${appId}/${contextId}`);
  url.searchParams.set("l", "english");
  url.searchParams.set("count", String(count));
  if (startAssetId) url.searchParams.set("start_assetid", String(startAssetId));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json"
    }
  });

  if (response.status === 403) {
    throw ApiError.forbidden("Steam inventory is private or unavailable");
  }
  if (response.status === 429) {
    throw ApiError.tooManyRequests("Steam inventory is temporarily rate limited");
  }
  if (!response.ok) {
    throw new ApiError(502, `Steam inventory request failed with status ${response.status}`);
  }

  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    throw new ApiError(502, "Steam inventory returned an invalid response");
  }

  return payload;
}

export async function getInventorySourceStatus({ user }) {
  const connected = Boolean(user?.steamId);
  return {
    source: connected ? "steam" : "manual",
    connected,
    syncSupported: connected,
    steamId: user?.steamId || null,
    displayName: user?.displayName || null,
    avatarUrl: user?.avatarUrl || null,
    inventoryAppId: getConfig().steamInventory.appId,
    inventoryContextId: String(getConfig().steamInventory.contextId)
  };
}

export async function syncSteamInventory({ user }) {
  const steamId = ensureSteamUser(user);
  const config = getConfig();
  const appId = config.steamInventory.appId;
  const contextId = config.steamInventory.contextId;
  const count = Math.max(1, Math.min(config.steamInventory.pageSize, 5000));
  const maxPages = Math.max(1, config.steamInventory.maxPages);

  const items = [];
  let totalInventoryCount = 0;
  let pagesFetched = 0;
  let startAssetId = null;
  let moreItems = true;

  while (moreItems && pagesFetched < maxPages) {
    const payload = await fetchSteamInventoryPage({
      steamId,
      appId,
      contextId,
      count,
      startAssetId
    });

    const descriptions = Array.isArray(payload.descriptions) ? payload.descriptions : [];
    const descriptionMap = new Map(
      descriptions.map((description) => [
        `${String(description.classid ?? "")}_${String(description.instanceid ?? "")}`,
        description
      ])
    );

    const assets = Array.isArray(payload.assets) ? payload.assets : [];
    for (const asset of assets) {
      const key = `${String(asset.classid ?? "")}_${String(asset.instanceid ?? "")}`;
      const description = descriptionMap.get(key) || null;
      items.push(normalizeSteamInventoryItem(asset, description, { appId, contextId }));
    }

    totalInventoryCount = Number(payload.total_inventory_count ?? totalInventoryCount ?? items.length) || items.length;
    pagesFetched += 1;
    moreItems = Boolean(payload.more_items) && Boolean(payload.last_assetid);
    startAssetId = moreItems ? String(payload.last_assetid) : null;
  }

  const tradableItems = items.filter((item) => item.tradable).length;
  const marketableItems = items.filter((item) => item.marketable).length;
  const pricing = await buildMarketplacePricing(items);
  const pricedItems = items.map((item) => ({
    ...item,
    pricing:
      (item.marketHashName && pricing.pricingByName.get(item.marketHashName)) || {
        bestMarketplace: null,
        bestPrice: null,
        bestNetPrice: null,
        bestFeeRate: null,
        bestReference: null,
        markets: []
      },
    ...getSteamItemSellStatus({
      item,
      pricing:
        (item.marketHashName && pricing.pricingByName.get(item.marketHashName)) || {
          bestMarketplace: null,
          bestPrice: null,
          bestNetPrice: null,
          bestFeeRate: null,
          bestReference: null,
          markets: []
        }
    })
  }));

  return {
    source: "steam",
    steamId,
    fetchedAt: new Date().toISOString(),
    counts: {
      importedItems: pricedItems.length,
      totalInventoryCount,
      tradableItems,
      marketableItems,
      pagesFetched,
      pricedItems: pricing.pricedItems
    },
    marketplaces: {
      enabled: pricing.enabledMarketplaces,
      uniqueItemsProcessed: pricing.uniqueItemsProcessed,
      skippedUniqueNames: pricing.skippedUniqueNames
    },
    items: pricedItems
  };
}

