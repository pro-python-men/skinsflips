import { ApiError } from "../../shared/errors/ApiError.js";

export async function fetchCsfloatListings({
  limit = 1000,
  sortBy = "lowest_price",
  type = "buy_now",
  marketHashName,
  cursor
} = {}) {
  const apiKey = process.env.CSFLOAT_API_KEY || "";
  if (!apiKey) throw ApiError.badRequest("Missing CSFLOAT_API_KEY");

  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 50));

  const url = new URL("https://csfloat.com/api/v1/listings");
  url.searchParams.set("limit", String(safeLimit));
  url.searchParams.set("sort_by", sortBy);
  url.searchParams.set("type", type);
  if (typeof marketHashName === "string" && marketHashName.trim()) {
    url.searchParams.set("market_hash_name", marketHashName.trim());
  }
  if (typeof cursor === "string" && cursor.trim()) {
    url.searchParams.set("cursor", cursor.trim());
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: apiKey,
      Accept: "application/json"
    }
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : "CSFloat request failed";
    throw new Error(`CSFloat HTTP ${res.status}: ${msg}`);
  }

  return data;
}
