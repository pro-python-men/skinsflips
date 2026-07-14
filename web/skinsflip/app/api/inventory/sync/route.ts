export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";

function normalizeSteamInventoryItem(item: any) {
  const pricing = item?.pricing && typeof item.pricing === "object" ? item.pricing : {};
  const markets = Array.isArray(pricing?.markets) ? pricing.markets : [];

  return {
    assetId: String(item?.assetId ?? ""),
    classId: String(item?.classId ?? ""),
    instanceId: String(item?.instanceId ?? ""),
    amount: Number(item?.amount ?? 1),
    appId: Number(item?.appId ?? 730),
    contextId: String(item?.contextId ?? ""),
    name: String(item?.name ?? "Unknown item"),
    marketHashName: typeof item?.marketHashName === "string" ? item.marketHashName : null,
    type: typeof item?.type === "string" ? item.type : null,
    tradable: Boolean(item?.tradable),
    marketable: Boolean(item?.marketable),
    commodity: Boolean(item?.commodity),
    iconUrl: typeof item?.iconUrl === "string" ? item.iconUrl : null,
    rarity: typeof item?.rarity === "string" ? item.rarity : null,
    exterior: typeof item?.exterior === "string" ? item.exterior : null,
    source: "steam" as const,
    sellStatus: typeof item?.sellStatus === "string" ? item.sellStatus : "no_market_data",
    sellReason:
      typeof item?.sellReason === "string"
        ? item.sellReason
        : "Nie znaleziono jeszcze czytelnej rekomendacji sprzedazy dla tego itemu.",
    pricing: {
      bestMarketplace:
        typeof pricing?.bestMarketplace === "string" ? pricing.bestMarketplace : null,
      bestPrice: Number.isFinite(Number(pricing?.bestPrice)) ? Number(pricing.bestPrice) : null,
      bestNetPrice:
        Number.isFinite(Number(pricing?.bestNetPrice)) ? Number(pricing.bestNetPrice) : null,
      bestFeeRate:
        Number.isFinite(Number(pricing?.bestFeeRate)) ? Number(pricing.bestFeeRate) : null,
      bestReference:
        typeof pricing?.bestReference === "string" ? pricing.bestReference : null,
      markets: markets.map((market: any) => ({
        marketplace: String(market?.marketplace ?? "Unknown"),
        price: Number(market?.price ?? 0),
        netPrice: Number(market?.netPrice ?? 0),
        feeRate: Number(market?.feeRate ?? 0),
        fee: Number(market?.fee ?? 0),
        reference: String(market?.reference ?? "market price"),
        volume: Number.isFinite(Number(market?.volume)) ? Number(market.volume) : null,
        isCached: Boolean(market?.isCached),
        rateLimited: Boolean(market?.rateLimited),
        url: typeof market?.url === "string" ? market.url : null
      }))
    }
  };
}

export async function POST() {
  const { response, unauthorized: isUnauthorized } = await backendFetch("/inventory/sync", {
    method: "POST"
  });
  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  if (!response!.ok) {
    return NextResponse.json(data, { status: response!.status });
  }

  const normalized = {
    source: "steam",
    steamId: typeof data?.steamId === "string" ? data.steamId : "",
    fetchedAt: typeof data?.fetchedAt === "string" ? data.fetchedAt : new Date().toISOString(),
    counts: {
      importedItems: Number(data?.counts?.importedItems ?? 0),
      totalInventoryCount: Number(data?.counts?.totalInventoryCount ?? 0),
      tradableItems: Number(data?.counts?.tradableItems ?? 0),
      marketableItems: Number(data?.counts?.marketableItems ?? 0),
      pagesFetched: Number(data?.counts?.pagesFetched ?? 0),
      pricedItems: Number(data?.counts?.pricedItems ?? 0)
    },
    marketplaces: {
      enabled: Array.isArray(data?.marketplaces?.enabled) ? data.marketplaces.enabled : [],
      uniqueItemsProcessed: Number(data?.marketplaces?.uniqueItemsProcessed ?? 0),
      skippedUniqueNames: Number(data?.marketplaces?.skippedUniqueNames ?? 0)
    },
    items: Array.isArray(data?.items) ? data.items.map(normalizeSteamInventoryItem) : []
  };

  return NextResponse.json(normalized, { status: response!.status });
}
