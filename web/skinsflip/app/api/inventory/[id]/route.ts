export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from "next/server";
import { backendFetch, unauthorized } from "@/lib/backend";

export async function DELETE(
  _req: Request,
{ params }: { params: Promise<{ id: string }> }

) {
const { id } = await params;

  const { response, unauthorized: isUnauthorized } = await backendFetch(`/inventory/${id}`, {
    method: "DELETE"
  });
  if (isUnauthorized) return unauthorized();

  if (response!.status === 204) return new NextResponse(null, { status: 204 });

  const data = await response!.json().catch(() => null);
  return NextResponse.json(data || { message: "Failed to delete inventory item" }, { status: response!.status });
}
