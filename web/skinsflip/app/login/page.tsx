"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"

import { SteamLoginButton } from "@/components/steam-login-button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/hooks/use-toast"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/dashboard"
  const error = searchParams.get("error")
  const hasHandledSteamLogin = useRef(false)
  const [steamError, setSteamError] = useState<string | null>(null)
  const [isExchangingSteamLogin, setIsExchangingSteamLogin] = useState(false)

  useEffect(() => {
    if (!error) return

    if (error === "steam_auth_failed") {
      toast({
        title: "Steam login failed",
        description: "Try again in a moment.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Login error",
      description: String(error),
      variant: "destructive",
    })
  }, [error])

  useEffect(() => {
    if (hasHandledSteamLogin.current) return

    const params = new URLSearchParams(window.location.search)
    const claimedId = params.get("openid.claimed_id")
    if (!claimedId) return

    hasHandledSteamLogin.current = true
    setSteamError(null)
    setIsExchangingSteamLogin(true)

    const exchangeSteamLogin = async () => {
      try {
        const openidParams = Object.fromEntries(params.entries())

        const res = await fetch("/api/auth/steam/exchange", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ openidParams }),
        })

        const data = await res.json().catch(() => null)

        if (res.ok) {
          router.replace(nextPath)
          return
        }

        throw new Error(data?.message || "Steam login failed")
      } catch (exchangeError) {
        const message =
          exchangeError instanceof Error ? exchangeError.message : "Steam login failed"
        setSteamError(message)
        toast({
          title: "Steam login failed",
          description: message,
          variant: "destructive",
        })
      } finally {
        setIsExchangingSteamLogin(false)
      }
    }

    void exchangeSteamLogin()
  }, [nextPath, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.16),transparent_32%),linear-gradient(180deg,#09110d_0%,#060807_100%)] p-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0d1512]/95 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent p-2">
              <div className="overflow-hidden rounded-xl border border-white/10 shadow-lg shadow-black/30">
                <Image
                  src="/logo.png"
                  alt="SkinFlip logo"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-cover"
                />
              </div>
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">CS2 Skin Flipper</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with Steam to track flips, inventory, and live opportunities.
          </p>
        </div>

        {isExchangingSteamLogin ? (
          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-100">
            <div className="flex items-center gap-3">
              <Spinner className="size-4 text-emerald-300" />
              <div>
                <p className="font-medium text-emerald-200">Finalizing Steam sign-in</p>
                <p className="mt-1 text-emerald-100/80">
                  Verifying your Steam response and preparing your session.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {error || steamError ? (
          <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {steamError
              ? steamError
              : error === "steam_auth_failed"
                ? "Steam login failed. Try again."
                : `Login error: ${error}`}
          </div>
        ) : null}

        <SteamLoginButton
          href={`/api/auth/steam?next=${encodeURIComponent(nextPath)}`}
          anchorClassName={[
            "w-full justify-center rounded-xl bg-[#1b2838] px-4 py-3 text-white transition",
            "hover:bg-[#2a475e]",
            isExchangingSteamLogin ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        />

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You will be redirected back to{" "}
          <span className="font-medium text-foreground">{nextPath}</span> after sign-in.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
