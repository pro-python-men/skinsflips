export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";

function normalizeLiquidity(liquidity: unknown) {
  if (liquidity === "HIGH") return "high";
  if (liquidity === "MEDIUM") return "medium";
  if (liquidity === "LOW") return "low";
  if (liquidity === "high" || liquidity === "medium" || liquidity === "low") return liquidity;
  return undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `/flips/best?${qs}` : "/flips/best";

  const { response, unauthorized: isUnauthorized } = await backendFetch(path);
  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  if (!response!.ok) {
    return NextResponse.json(
      data || { message: "Failed to fetch best flips" },
      { status: response!.status }
    );
  }

  const payload =
    data && typeof data === "object" && !Array.isArray(data) ? data : { flips: data };

  const flipsRaw = Array.isArray((payload as any).flips) ? (payload as any).flips : [];
  const normalizedFlips = flipsRaw.map((f: any) => ({
    id: String(f.id),
    itemName: String(f.itemName ?? f.name),
    name: String(f.name ?? f.itemName),
    buyPrice: Number(f.buyPrice),
    sellPrice: Number(f.sellPrice),
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
    createdAt: f.createdAt == null ? undefined : String(f.createdAt)
  }));

  const out = {
    flips: normalizedFlips,
    isCached: Boolean((payload as any).isCached),
    lastUpdated:
      (payload as any).lastUpdated == null ? null : Number((payload as any).lastUpdated)
  };

  return NextResponse.json(out, { status: 200 });
}
