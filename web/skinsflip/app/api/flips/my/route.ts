export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";

export async function GET() {
  const { response, unauthorized: isUnauthorized } = await backendFetch("/flips/my");
  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  if (!response!.ok) {
    return NextResponse.json(
      data || { message: "Failed to fetch tracked flips" },
      { status: response!.status }
    );
  }

  const normalized = Array.isArray(data)
    ? data.map((flip) => ({
        id: String(flip.id),
        skinName: String(flip.skinName),
        buyPrice: Number(flip.buyPrice),
        sellPriceExpected: Number(flip.sellPriceExpected),
        sellPriceActual:
          flip.sellPriceActual === null || flip.sellPriceActual === undefined
            ? null
            : Number(flip.sellPriceActual),
        profitExpected: Number(flip.profitExpected),
        profitActual:
          flip.profitActual === null || flip.profitActual === undefined
            ? null
            : Number(flip.profitActual),
        sourceBuy: String(flip.sourceBuy ?? ""),
        sourceSell: String(flip.sourceSell ?? ""),
        status: String(flip.status ?? "tracked"),
        roiExpected: Number(flip.roiExpected ?? 0),
        roiActual:
          flip.roiActual === null || flip.roiActual === undefined
            ? null
            : Number(flip.roiActual),
        createdAt: String(flip.createdAt ?? new Date().toISOString()),
        completedAt: flip.completedAt ? String(flip.completedAt) : null
      }))
    : [];

  return NextResponse.json(normalized, { status: 200 });
}
