import { ApiError } from "../../shared/errors/ApiError.js";

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getBuffAuthHeaders() {
  const cookie = asText(process.env.BUFFMARKET_COOKIE || "");
  if (!cookie) {
    throw ApiError.badRequest("Missing BUFFMARKET_COOKIE");
  }

  const cookies = parseCookieHeader(cookie);
  const cookieKeys = Object.keys(cookies);
  if (cookieKeys.length === 0) {
    throw ApiError.badRequest(
      'Invalid BUFFMARKET_COOKIE: expected a Cookie header like "name=value; name2=value2"'
    );
  }
  const csrfToken = asText(cookies.csrf_token || "");

  return {
    Cookie: cookie,
    ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    Origin: "https://buff.market",
    Referer: "https://buff.market/market/csgo",
    "X-Requested-With": "XMLHttpRequest"
  };
}

function parseCookieHeader(cookieHeader) {
  const out = {};
  const raw = asText(cookieHeader);
  if (!raw) return out;

  for (const part of raw.split(";")) {
    const s = part.trim();
    if (!s) continue;
    const idx = s.indexOf("=");
    if (idx <= 0) continue;
    const key = s.slice(0, idx).trim();
    const value = s.slice(idx + 1).trim();
    if (key) out[key] = value;
  }

  return out;
}

function buffResult(data, meta) {
  return { data, meta };
}

function parseBuffApiPayload(payload) {
  const p = payload && typeof payload === "object" ? payload : null;
  const codeValue = p && "code" in p ? p.code : null;
  const code = codeValue === null || codeValue === undefined ? "" : String(codeValue);

  const ok =
    code === "" ||
    code === "OK" ||
    code === "0" ||
    code.toLowerCase() === "success";

  if (!ok) {
    const error =
      p && typeof p === "object" && "error" in p
        ? String(p.error || "")
        : p && typeof p === "object" && "message" in p
          ? String(p.message || "")
          : "";

    if (code.toLowerCase().includes("login") || error.toLowerCase().includes("login")) {
      throw ApiError.badRequest(
        "BUFF Market API login required (set BUFFMARKET_COOKIE and enable BEST_FLIPS_ENABLE_BUFFMARKET_BUY)"
      );
    }
    throw new Error(`BUFF Market API error: ${code}${error ? ` - ${error}` : ""}`);
  }

  return p && "data" in p ? p.data : null;
}

async function buffFetchJson(url, { requireAuth = true } = {}) {
  const headers = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0",
    ...(requireAuth ? getBuffAuthHeaders() : {})
  };

  const res = await fetch(url.toString(), { headers });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "message" in json
        ? String(json.message || "")
        : json && typeof json === "object" && "error" in json
          ? String(json.error || "")
          : "";
    throw new Error(`BUFF Market HTTP ${res.status}${msg ? `: ${msg}` : ""}`);
  }

  return json;
}

export async function fetchBuffmarketGoodsSearch({
  game = "csgo",
  search,
  pageNum = 1,
  pageSize = 20,
  sortBy
} = {}) {
  const safePageNum = Math.max(1, Math.round(Number(pageNum) || 1));
  const safePageSize = Math.min(80, Math.max(1, Math.round(Number(pageSize) || 20)));

  const url = new URL("https://api.buff.market/api/market/goods");
  url.searchParams.set("game", String(game || "csgo"));
  url.searchParams.set("page_num", String(safePageNum));
  url.searchParams.set("page_size", String(safePageSize));
  url.searchParams.set("search", asText(search));
  if (asText(sortBy)) url.searchParams.set("sort_by", asText(sortBy));

  const json = await buffFetchJson(url, { requireAuth: true });
  return parseBuffApiPayload(json);
}

export async function fetchBuffmarketGoodsInfo({ goodsId } = {}) {
  const id = Number(goodsId);
  if (!Number.isFinite(id) || id <= 0) {
    throw ApiError.badRequest("goodsId must be a positive number");
  }

  const url = new URL("https://api.buff.market/api/market/goods/info");
  url.searchParams.set("goods_id", String(Math.round(id)));

  const json = await buffFetchJson(url, { requireAuth: true });
  return parseBuffApiPayload(json);
}

export function pickBuffmarketBuyCentsFromGoodsRow(row) {
  const r = row && typeof row === "object" ? row : null;
  const sellMin = r && "sell_min_price" in r ? Number(r.sell_min_price) : null;
  const quick = r && "quick_price" in r ? Number(r.quick_price) : null;

  const priceUsd =
    Number.isFinite(sellMin) && sellMin > 0 ? sellMin : Number.isFinite(quick) && quick > 0 ? quick : null;
  if (!priceUsd) return null;

  return Math.round(priceUsd * 100);
}
