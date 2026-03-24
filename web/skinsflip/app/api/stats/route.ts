export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";

export async function GET() {
  const { response, unauthorized: isUnauthorized } = await backendFetch("/stats");
  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  if (!response!.ok) {
    return NextResponse.json(data || { message: "Failed to fetch stats" }, { status: response!.status });
  }

  // Normalize backend casing to frontend expectations.
  return NextResponse.json(
    {
      totalProfit: Number(data?.totalProfit ?? 0),
      averageROI: Number(data?.averageRoi ?? 0),
      totalFlips: Number(data?.totalFlips ?? 0),
      inventoryValue: Number(data?.inventoryValue ?? 0)
    },
    { status: 200 }
  );
}
