export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";

export async function GET() {
  const { response, unauthorized: isUnauthorized } = await backendFetch("/auth/me");
  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  return NextResponse.json(data, { status: response!.status });
}
