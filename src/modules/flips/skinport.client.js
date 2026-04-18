import https from "node:https";
import zlib from "node:zlib";

const itemsCache = { at: 0, key: "", data: null };
const ITEMS_CACHE_MS = 5 * 60_000;

const salesCache = new Map();
const SALES_CACHE_MS = 10 * 60_000;

const RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;
let itemsBlockedUntil = 0;
let salesBlockedUntil = 0;

let lastRateLimitWarnAt = 0;
function warnRateLimited(scope) {
  const now = Date.now();
  if (now - lastRateLimitWarnAt < 60_000) return;
  lastRateLimitWarnAt = now;
  console.warn(`[skinport] rate limited (${scope}) - returning cached/empty result`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function result(data, meta) {
  return { data, meta };
}

function getJsonWithBrotli(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "br",
          "User-Agent": "Mozilla/5.0"
        }
      },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          try {
            let buf = Buffer.concat(chunks);
            const enc = String(res.headers["content-encoding"] || "");
            if (enc.includes("br")) {
              buf = zlib.brotliDecompressSync(buf);
            }

            const text = buf.toString("utf8");
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(`Skinport HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
            }

            resolve(JSON.parse(text));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("error", reject);
  });
}

async function getJsonWithRetries(url, { retries = 2 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await getJsonWithBrotli(url);
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "";
      const is429 = msg.includes("HTTP 429") || msg.toLowerCase().includes("rate limit");
      if (!is429 || attempt >= retries) throw e;

      const backoff = 750 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
      await sleep(backoff);
      attempt += 1;
    }
  }
}

export async function fetchSkinportItems({ appId = 730, currency = "USD", tradable = 1 } = {}) {
  const url = `https://api.skinport.com/v1/items?app_id=${appId}&currency=${encodeURIComponent(
    currency
  )}&tradable=${tradable ? 1 : 0}`;

  const now = Date.now();
  const key = url;
  if (now < itemsBlockedUntil) {
    if (itemsCache.data && itemsCache.key === key) {
      return result(itemsCache.data, {
        isCached: true,
        rateLimited: true,
        lastUpdated: itemsCache.at || null
      });
    }
    return result([], { isCached: false, rateLimited: true, lastUpdated: null });
  }
  if (itemsCache.data && itemsCache.key === key && now - itemsCache.at < ITEMS_CACHE_MS) {
    return result(itemsCache.data, {
      isCached: true,
      rateLimited: false,
      lastUpdated: itemsCache.at || null
    });
  }

  try {
    const data = await getJsonWithRetries(url, { retries: 2 });
    itemsCache.at = now;
    itemsCache.key = key;
    itemsCache.data = data;
    return result(data, { isCached: false, rateLimited: false, lastUpdated: now });
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "";
    const is429 = msg.includes("HTTP 429") || msg.toLowerCase().includes("rate limit");
    if (is429) {
      warnRateLimited("items");
      itemsBlockedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      if (itemsCache.data && itemsCache.key === key) {
        return result(itemsCache.data, {
          isCached: true,
          rateLimited: true,
          lastUpdated: itemsCache.at || null
        });
      }
      return result([], { isCached: false, rateLimited: true, lastUpdated: null });
    }
    throw e;
  }
}

export async function fetchSkinportSalesHistory({
  appId = 730,
  currency = "USD",
  marketHashNames
} = {}) {
  const params = new URLSearchParams({
    app_id: String(appId),
    currency: String(currency)
  });

  const list = Array.isArray(marketHashNames)
    ? marketHashNames
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
    : [];

  if (list.length > 0) {
    params.set("market_hash_name", list.join(","));
  }

  const url = `https://api.skinport.com/v1/sales/history?${params.toString()}`;

  const now = Date.now();
  const key = url;
  if (now < salesBlockedUntil) {
    const cached0 = salesCache.get(key) || null;
    if (cached0 && cached0.data) {
      return result(cached0.data, {
        isCached: true,
        rateLimited: true,
        lastUpdated: cached0.at || null
      });
    }
    return result([], { isCached: false, rateLimited: true, lastUpdated: null });
  }
  const cached = salesCache.get(key) || null;
  if (cached && now - cached.at < SALES_CACHE_MS) {
    return result(cached.data, {
      isCached: true,
      rateLimited: false,
      lastUpdated: cached.at || null
    });
  }

  try {
    const data = await getJsonWithRetries(url, { retries: 2 });
    salesCache.set(key, { at: now, data });
    return result(data, { isCached: false, rateLimited: false, lastUpdated: now });
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "";
    const is429 = msg.includes("HTTP 429") || msg.toLowerCase().includes("rate limit");
    if (is429) {
      warnRateLimited("sales/history");
      salesBlockedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      if (cached && cached.data) {
        return result(cached.data, {
          isCached: true,
          rateLimited: true,
          lastUpdated: cached.at || null
        });
      }
      return result([], { isCached: false, rateLimited: true, lastUpdated: null });
    }
    throw e;
  }
}
