export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";

export async function GET() {
  const { response, unauthorized: isUnauthorized } = await backendFetch("/flips");
  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  if (!response!.ok) {
    return NextResponse.json(data || { message: "Failed to fetch flips" }, { status: response!.status });
  }

  const normalized = Array.isArray(data)
    ? data.map((f) => ({
        id: String(f.id),
        skin: String(f.skin),
        buyPrice: Number(f.buyPrice),
        sellPrice: Number(f.sellPrice),
        profit: Number(f.profit),
        roi: Number(f.roi),
        date: f.createdAt || f.date || new Date().toISOString()
      }))
    : [];

  return NextResponse.json(normalized, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { response, unauthorized: isUnauthorized } = await backendFetch("/flips", {
    method: "POST",
    body: JSON.stringify(body)
  });
  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  if (!response!.ok) {
    return NextResponse.json(data || { message: "Failed to create flip" }, { status: response!.status });
  }

  return NextResponse.json(
    {
      id: String(data.id),
      skin: String(data.skin),
      buyPrice: Number(data.buyPrice),
      sellPrice: Number(data.sellPrice),
      profit: Number(data.profit),
      roi: Number(data.roi),
      date: data.createdAt || new Date().toISOString()
    },
    { status: 201 }
  );
}
