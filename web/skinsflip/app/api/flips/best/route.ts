export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";
import { getServerApiBaseUrl } from "@/lib/server-env";

const API_BASE_URL = getServerApiBaseUrl();

type BestFlipsPayload = {
  flips: any[];
  isCached: boolean;
  lastUpdated: number | null;
  rateLimited?: boolean;
  scanMeta?: Record<string, unknown> | null;
};

const lastSuccessfulPayloads = new Map<string, BestFlipsPayload>();

function getCacheKey(url: URL) {
  const params = new URLSearchParams(url.searchParams);
  params.sort();
  const qs = params.toString();
  return qs ? `/flips/best?${qs}` : "/flips/best";
}

function normalizeLiquidity(liquidity: unknown) {
  if (liquidity === "HIGH") return "high";
  if (liquidity === "MEDIUM") return "medium";
  if (liquidity === "LOW") return "low";
  if (liquidity === "high" || liquidity === "medium" || liquidity === "low") return liquidity;
  return undefined;
}

function normalizePayload(data: unknown) {
  const payload =
    data && typeof data === "object" && !Array.isArray(data) ? data : { flips: data };

  const flipsRaw = Array.isArray((payload as any).flips) ? (payload as any).flips : [];
  const normalizedFlips = flipsRaw.map((f: any) => ({
    id: String(f.id),
    itemName: String(f.itemName ?? f.name),
    name: String(f.name ?? f.itemName),
    buyPrice: Number(f.buyPrice),
    sellPrice: Number(f.sellPrice),
    marketplaceFee: f.marketplaceFee == null ? undefined : Number(f.marketplaceFee),
    marketplaceFeeRate: f.marketplaceFeeRate == null ? undefined : Number(f.marketplaceFeeRate),
    netSell: f.netSell == null ? undefined : Number(f.netSell),
    profit: Number(f.profit),
    roi: Number(f.roi ?? f.profitPercent ?? 0),
    profitPercent: f.profitPercent == null ? undefined : Number(f.profitPercent),
    rankScore: f.rankScore == null ? undefined : Number(f.rankScore),
    sourceBuy: String(f.sourceBuy ?? "CSFloat"),
    sourceSell: String(f.sourceSell ?? "Skinport"),
    listingCount: f.listingCount == null ? undefined : Number(f.listingCount),
    liquidity: normalizeLiquidity(f.liquidity),
    liquidityTier:
      f.liquidity === "HIGH" || f.liquidity === "MEDIUM" || f.liquidity === "LOW"
        ? f.liquidity
        : undefined,
    confidence: f.confidence == null ? undefined : Number(f.confidence),
    eta: f.eta == null ? undefined : String(f.eta),
    sellWindow: f.sellWindow == null ? undefined : String(f.sellWindow),
    salesLast7d: f.salesLast7d == null ? undefined : Number(f.salesLast7d),
    salesLast30d: f.salesLast30d == null ? undefined : Number(f.salesLast30d),
    stabilityScore: f.stabilityScore == null ? undefined : Number(f.stabilityScore),
    priceLastUpdated: f.priceLastUpdated == null ? undefined : Number(f.priceLastUpdated),
    salesDataLastUpdated:
      f.salesDataLastUpdated == null ? undefined : Number(f.salesDataLastUpdated),
    dataStatus: f.dataStatus == null ? undefined : String(f.dataStatus),
    createdAt: f.createdAt == null ? undefined : String(f.createdAt)
  }));

  return {
    flips: normalizedFlips,
    isCached: Boolean((payload as any).isCached),
    rateLimited: Boolean((payload as any).rateLimited),
    lastUpdated:
      (payload as any).lastUpdated == null ? null : Number((payload as any).lastUpdated),
    scanMeta:
      (payload as any).scanMeta && typeof (payload as any).scanMeta === "object"
        ? (payload as any).scanMeta
        : null
  };
}

async function fetchPublicBestFlips(path: string) {
  const response = await fetch(`${API_BASE_URL}/public${path}`, {
    cache: "no-store"
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = getCacheKey(url);
  const lastSuccessfulPayload = lastSuccessfulPayloads.get(path) ?? null;

  const { response, unauthorized: isUnauthorized } = await backendFetch(path);
  if (!isUnauthorized) {
    const data = await response!.json().catch(() => null);
    if (response!.ok) {
      const out = normalizePayload(data);
      if (out.flips.length > 0) {
        lastSuccessfulPayloads.set(path, out);
      }
      return NextResponse.json(out, { status: 200 });
    }
  }

  if (isUnauthorized) {
    try {
      const publicResult = await fetchPublicBestFlips(path);
      if (publicResult.response.ok) {
        const out = normalizePayload(publicResult.data);
        if (out.flips.length > 0) {
          lastSuccessfulPayloads.set(path, out);
        }
        return NextResponse.json(out, { status: 200 });
      }
    } catch {
      // Fall back to the last successful payload below.
    }
  }

  if (lastSuccessfulPayload) {
    return NextResponse.json(
      {
        ...lastSuccessfulPayload,
        flips: lastSuccessfulPayload.flips.map((flip) => ({
          ...flip,
          dataStatus: "last_successful_scan"
        })),
        isCached: true,
        lastUpdated: lastSuccessfulPayload.lastUpdated
      },
      { status: 200 }
    );
  }

  if (isUnauthorized) return unauthorized();

  return NextResponse.json(
    { message: "Failed to fetch best flips" },
    { status: 502 }
  );
}
