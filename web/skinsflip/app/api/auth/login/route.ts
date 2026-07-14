import { NextResponse } from "next/server";
import { getServerApiBaseUrl } from "@/lib/server-env";

const API_BASE_URL = getServerApiBaseUrl();

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data || { message: "Login failed" }, { status: res.status });
  }

  const token = data?.token;
  if (!token) {
    return NextResponse.json({ message: "Invalid login response" }, { status: 502 });
  }

  const response = NextResponse.json({ user: data.user }, { status: 200 });
  response.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
}

