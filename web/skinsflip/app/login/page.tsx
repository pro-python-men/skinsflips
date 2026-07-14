"use client"

import Image from "next/image"
import Link from "next/link"
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
    <main className="min-h-screen bg-transparent text-foreground">
      <header className="border-b border-white/8 topbar-blur">
        <div className="content-frame">
          <div className="flex min-h-[74px] items-center justify-between gap-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/stronka.png"
                alt="SkinFlip logo"
                width={144}
                height={36}
                className="h-8 w-auto object-contain"
                priority
              />
            </Link>
            <Link
              href="/"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <div className="content-frame flex min-h-[calc(100vh-75px)] items-center justify-center py-10">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="surface-panel rounded-[2rem] p-6 lg:hidden">
            <div className="space-y-4">
              <p className="section-heading">Trading workspace</p>
              <h1 className="max-w-[14ch] text-3xl font-semibold leading-[0.96] tracking-[-0.05em] text-white">
                Sign in to continue tracking live flips
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Access your ranked board, tracked opportunities, and inventory exit planning from one consistent dashboard.
              </p>
            </div>
          </section>

          <section className="surface-panel hidden rounded-[2rem] p-8 lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-6">
              <p className="section-heading">Trading workspace</p>
              <div className="space-y-4">
                <h1 className="max-w-[11ch] text-4xl font-semibold leading-[0.95] tracking-[-0.05em] text-white">
                  Sign in to continue tracking live flips
                </h1>
                <p className="max-w-[52ch] text-base leading-7 text-muted-foreground">
                  Access your ranked board, tracked opportunities, and inventory exit planning from one consistent dashboard.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Live board</p>
                <p className="mt-2 text-lg font-semibold text-white">Ranked opportunities</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Tracking</p>
                <p className="mt-2 text-lg font-semibold text-white">Entry to exit flow</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Inventory</p>
                <p className="mt-2 text-lg font-semibold text-white">Sell decisions</p>
              </div>
            </div>
          </section>

          <section className="surface-panel rounded-[2rem] p-6 sm:p-8">
            <div className="mb-8 text-center">
              <div className="mb-6 flex items-center justify-center">
                <div className="overflow-hidden rounded-[1.2rem] border border-white/8 bg-white/4 p-2">
                  <Image
                    src="/logo.png"
                    alt="SkinFlip logo"
                    width={64}
                    height={64}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                </div>
              </div>
              <p className="section-heading">Sign in</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Continue with Steam</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Sign in with Steam to track flips, inventory, and live opportunities.
              </p>
            </div>

            {isExchangingSteamLogin ? (
              <div className="mb-5 rounded-[1.4rem] border border-primary/20 bg-primary/8 p-4 text-sm text-foreground">
                <div className="flex items-center gap-3">
                  <Spinner className="size-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Finalizing Steam sign-in</p>
                    <p className="mt-1 text-muted-foreground">
                      Verifying your Steam response and preparing your session.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {error || steamError ? (
              <div className="mb-4 rounded-[1.2rem] border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {steamError
                  ? steamError
                  : error === "steam_auth_failed"
                    ? "Steam login failed. Try again."
                    : `Login error: ${error}`}
              </div>
            ) : null}

            <SteamLoginButton
              href={`/api/auth/steam?next=${encodeURIComponent(nextPath)}`}
              buttonClassName="w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
              anchorClassName={[
                "w-full justify-center px-0 py-0",
                isExchangingSteamLogin ? "pointer-events-none opacity-60" : "",
              ].join(" ")}
              useButtonWrapper
              iconSize={24}
            />

            <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-white/4 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Redirect
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                After sign-in you will return to{" "}
                <span className="font-medium text-foreground">{nextPath}</span>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
