import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data || { message: "Register failed" }, { status: res.status });
  }

  const token = data?.token;
  if (!token) {
    return NextResponse.json({ message: "Invalid register response" }, { status: 502 });
  }

  const response = NextResponse.json({ user: data.user }, { status: 201 });
  response.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
}

