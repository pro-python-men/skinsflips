import { NextResponse } from "next/server";

function safeNextPath(value: string | null) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  return value;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nextPath = safeNextPath(url.searchParams.get("next"));

  const origin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : url.origin);

  const returnTo = new URL("/api/auth/steam/callback", origin);
  returnTo.searchParams.set("next", nextPath);

  const realm = origin.endsWith("/") ? origin : `${origin}/`;

  const steamLogin = new URL("https://steamcommunity.com/openid/login");
  steamLogin.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0");
  steamLogin.searchParams.set("openid.mode", "checkid_setup");
  steamLogin.searchParams.set("openid.return_to", returnTo.toString());
  steamLogin.searchParams.set("openid.realm", realm);
  steamLogin.searchParams.set(
    "openid.identity",
    "http://specs.openid.net/auth/2.0/identifier_select"
  );
  steamLogin.searchParams.set(
    "openid.claimed_id",
    "http://specs.openid.net/auth/2.0/identifier_select"
  );

  return NextResponse.redirect(steamLogin.toString(), 302);
}
