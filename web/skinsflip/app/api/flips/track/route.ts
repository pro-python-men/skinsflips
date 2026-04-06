export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { response, unauthorized: isUnauthorized } = await backendFetch("/flips/track", {
    method: "POST",
    body: JSON.stringify(body)
  });

  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  if (!response!.ok) {
    return NextResponse.json(
      data || { message: "Failed to track flip" },
      { status: response!.status }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
