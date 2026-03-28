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
        skin: String(f.skin),
        buyPrice: Number(f.buyPrice),
        sellPrice: Number(f.sellPrice),
        profit: Number(f.profit),
        roi: Number(f.roi),
        source: String(f.source ?? "")
      }))
    : [];

  return NextResponse.json(normalized, { status: 200 });
}
