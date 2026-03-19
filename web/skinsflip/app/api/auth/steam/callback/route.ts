import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

function safeNextPath(value: string | null) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  return value;
}

function extractSteamId(claimedId: string | null) {
  if (!claimedId) return null;
  const match =
    claimedId.match(/\/openid\/id\/(\d{17})$/) ||
    claimedId.match(/\/id\/(\d{17})$/);
  return match?.[1] || null;
}

function redirectAbsolute(reqUrl: string, path: string, status = 302) {
  const origin = new URL(reqUrl).origin;
  return NextResponse.redirect(new URL(path, origin), status);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nextPath = safeNextPath(url.searchParams.get("next"));

  try {
    // 1) Zbierz openid.* z query
    const openIdParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (key.startsWith("openid.")) openIdParams.set(key, value);
    }
    openIdParams.set("openid.mode", "check_authentication");

    // 2) Zweryfikuj podpis w Steam (OpenID)
    const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: openIdParams.toString(),
      cache: "no-store"
    });

    const verifyText = await verifyRes.text().catch(() => "");
    const isValid = verifyRes.ok && /is_valid\s*:\s*true/i.test(verifyText);
    if (!isValid) {
      return redirectAbsolute(
        req.url,
        `/login?error=steam_auth_failed&next=${encodeURIComponent(nextPath)}`
      );
    }

    // 3) Wyciągnij steamId z claimed_id
    const steamId = extractSteamId(url.searchParams.get("openid.claimed_id"));
    if (!steamId) {
      return redirectAbsolute(
        req.url,
        `/login?error=steam_auth_failed&next=${encodeURIComponent(nextPath)}`
      );
    }

    // 4) Exchange w backendzie: steamId -> JWT
    const exchangeRes = await fetch(`${API_BASE_URL}/auth/steam/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steamId }),
      cache: "no-store"
    });

    const exchangeData = await exchangeRes.json().catch(() => null);
    const token = exchangeData?.token;
    if (!exchangeRes.ok || !token) {
      return redirectAbsolute(
        req.url,
        `/login?error=steam_auth_failed&next=${encodeURIComponent(nextPath)}`
      );
    }

    // 5) Ustaw cookie na domenie frontu + redirect absolutny
    const origin = new URL(req.url).origin;
    const response = NextResponse.redirect(new URL(nextPath, origin), 302);

    response.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (err) {
    console.error("Steam callback error:", err);
    return redirectAbsolute(
      req.url,
      `/login?error=steam_auth_failed&next=${encodeURIComponent(nextPath)}`
    );
  }
}
