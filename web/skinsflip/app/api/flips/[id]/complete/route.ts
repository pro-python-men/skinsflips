export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";

type Context = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: Context) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const { response, unauthorized: isUnauthorized } = await backendFetch(`/flips/${id}/complete`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });

  if (isUnauthorized) return unauthorized();

  const data = await response!.json().catch(() => null);
  if (!response!.ok) {
    return NextResponse.json(
      data || { message: "Failed to complete flip" },
      { status: response!.status }
    );
  }

  return NextResponse.json(data, { status: 200 });
}
