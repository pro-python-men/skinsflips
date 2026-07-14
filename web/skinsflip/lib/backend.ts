import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerApiBaseUrl } from "@/lib/server-env";

const API_BASE_URL = getServerApiBaseUrl();

export async function getTokenFromCookies() {
  const store = await cookies();
  return store.get("token")?.value || null;
}

export function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function backendFetch(path: string, init: RequestInit = {}) {
  const token = await getTokenFromCookies();
  if (!token) return { response: null, unauthorized: true };

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  return { response, unauthorized: false };
}
