import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";

export async function GET() {
  const { response, unauthorized: isUnauthorized } = await backendFetch("/inventory");
  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  if (!response!.ok) {
    return NextResponse.json(data || { message: "Failed to fetch inventory" }, { status: response!.status });
  }

  const normalized = Array.isArray(data)
    ? data.map((it) => ({
        id: String(it.id),
        skin: String(it.skin),
        purchasePrice: Number(it.purchasePrice),
        currentPrice: Number(it.currentPrice),
        quantity: Number(it.quantity),
        createdAt: it.createdAt
      }))
    : [];

  return NextResponse.json(normalized, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { response, unauthorized: isUnauthorized } = await backendFetch("/inventory", {
    method: "POST",
    body: JSON.stringify(body)
  });
  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  if (!response!.ok) {
    return NextResponse.json(data || { message: "Failed to create inventory item" }, { status: response!.status });
  }

  return NextResponse.json(
    {
      id: String(data.id),
      skin: String(data.skin),
      purchasePrice: Number(data.purchasePrice),
      currentPrice: Number(data.currentPrice),
      quantity: Number(data.quantity),
      createdAt: data.createdAt
    },
    { status: 201 }
  );
}

