export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";

export async function GET() {
  const { response, unauthorized: isUnauthorized } = await backendFetch("/flips/best");
  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  if (!response!.ok) {
    return NextResponse.json(
      data || { message: "Failed to fetch best flips" },
      { status: response!.status }
    );
  }

  const normalized = Array.isArray(data)
    ? data.map((f) => ({
        id: String(f.id),
        name: String(f.name),
        buyPrice: Number(f.buyPrice),
        sellPrice: Number(f.sellPrice),
        profit: Number(f.profit),
        roi: Number(f.roi),
        profitPercent: f.profitPercent == null ? undefined : Number(f.profitPercent),
        rankScore: f.rankScore == null ? undefined : Number(f.rankScore),
        sourceBuy: String(f.sourceBuy),
        sourceSell: String(f.sourceSell),
        listingCount:
          f.listingCount == null ? undefined : Number(f.listingCount),
        liquidity:
          f.liquidity === "high" || f.liquidity === "medium" || f.liquidity === "low"
            ? f.liquidity
            : undefined,
        confidence:
          f.confidence == null ? undefined : Number(f.confidence),
        eta: f.eta == null ? undefined : String(f.eta),
        sellWindow: f.sellWindow == null ? undefined : String(f.sellWindow),
        salesLast7d: f.salesLast7d == null ? undefined : Number(f.salesLast7d),
        salesLast30d: f.salesLast30d == null ? undefined : Number(f.salesLast30d),
        stabilityScore: f.stabilityScore == null ? undefined : Number(f.stabilityScore),
        createdAt: f.createdAt == null ? undefined : String(f.createdAt)
      }))
    : [];

  return NextResponse.json(normalized, { status: 200 });
}
