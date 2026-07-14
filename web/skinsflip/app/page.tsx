"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, DollarSign, Search, TrendingUp } from "lucide-react"
import { DealCard } from "@/components/deal-card"
import { LegalFooter } from "@/components/legal-footer"
import { SteamLoginButton } from "@/components/steam-login-button"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api"
import type { BestFlipsResponse, Flip } from "@/lib/types/flip"

type AuthUser = {
  id?: number
}

function formatUpdatedSeconds(lastUpdatedAt: number | null) {
  if (lastUpdatedAt === null) {
    return "Updated just now"
  }

  const seconds = Math.max(0, Math.floor((Date.now() - lastUpdatedAt) / 1000))
  const label = seconds === 1 ? "second" : "seconds"
  return `Updated ${seconds} ${label} ago`
}

const steps = [
  {
    title: "Find profitable skins",
    icon: Search,
  },
  {
    title: "Buy from the cheaper marketplace",
    icon: DollarSign,
  },
  {
    title: "Track the exit and sell for profit",
    icon: TrendingUp,
  },
]

const primaryNav = [
  { href: "#live-board", label: "Live board" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/dashboard", label: "Dashboard" },
]

export default function HomePage() {
  const router = useRouter()
  const updateIntervalMs = 15000
  const [user, setUser] = useState<AuthUser | null>(null)
  const [flips, setFlips] = useState<Flip[]>([])
  const [trackedIds, setTrackedIds] = useState<Record<string, boolean>>({})
  const [trackingIds, setTrackingIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [updatedLabel, setUpdatedLabel] = useState("Updated just now")
  const [buySources, setBuySources] = useState(() => {
    try {
      if (typeof window === "undefined") {
        return { csfloat: true, skinport: false, buff: false }
      }
      const raw = window.localStorage.getItem("bestFlipsBuySources") || ""
      const parsed = raw ? (JSON.parse(raw) as any) : null
      const csfloat = parsed && typeof parsed === "object" ? Boolean(parsed.csfloat) : true
      const skinport = parsed && typeof parsed === "object" ? Boolean(parsed.skinport) : false
      const buff = parsed && typeof parsed === "object" ? Boolean(parsed.buff) : false
      return { csfloat, skinport, buff }
    } catch {
      return { csfloat: true, skinport: false, buff: false }
    }
  })

  const destination = user ? "/dashboard" : "/login"
  const liveFlips = flips.slice(0, 5)
  const heroFlip = liveFlips[0] ?? null
  const sideFlips = liveFlips.slice(1)

  const goToDeals = () => {
    window.location.href = destination
  }

  const getBuyHref = (flip: Flip) => {
    const source = String(flip.sourceBuy || "").toLowerCase()
    const itemName = String(flip.itemName ?? flip.name ?? "").trim()
    const q = itemName ? encodeURIComponent(itemName) : ""

    if (source.includes("csfloat")) {
      return itemName ? `https://csfloat.com/search?market_hash_name=${q}` : "https://csfloat.com/"
    }
    if (source.includes("skinport")) {
      return itemName ? `https://skinport.com/market?search=${q}` : "https://skinport.com/market"
    }
    if (source.includes("buff")) {
      return itemName ? `https://buff.market/market/all?search=${q}` : "https://buff.market/market/all"
    }

    return null
  }

  const trackFlip = async (flip: Flip) => {
    if (!user) {
      router.push("/login")
      return
    }

    if (trackingIds[flip.id] || trackedIds[flip.id]) return

    setTrackingIds((current) => ({ ...current, [flip.id]: true }))

    try {
      await apiFetch("/api/flips/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skinName: flip.itemName ?? flip.name,
          buyPrice: flip.buyPrice,
          sellPriceExpected: flip.sellPrice,
          sourceBuy: flip.sourceBuy,
          sourceSell: flip.sourceSell,
        }),
      })

      setTrackedIds((current) => ({ ...current, [flip.id]: true }))
      toast({
        title: "Tracking this opportunity",
        description: `${flip.name} is now in Tracking.`,
      })
    } catch (e: any) {
      toast({
        title: "Could not track flip",
        description: e?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setTrackingIds((current) => {
        const next = { ...current }
        delete next[flip.id]
        return next
      })
    }
  }

  useEffect(() => {
    try {
      window.localStorage.setItem("bestFlipsBuySources", JSON.stringify(buySources))
    } catch {
      // ignore
    }
  }, [buySources])

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true)
      setError("")

      try {
        const selectedSources = Object.entries(buySources)
          .filter(([, enabled]) => Boolean(enabled))
          .map(([key]) => key)
        const buySourcesCsv =
          selectedSources.length === 0 ? "csfloat" : selectedSources.join(",")
        const buySourcesQs = `?buySources=${encodeURIComponent(buySourcesCsv)}`

        const [authData, flipsData] = await Promise.all([
          apiFetch("/api/auth/me").catch(() => null),
          apiFetch(`/api/flips/best${buySourcesQs}`),
        ])

        setUser((authData as { user?: AuthUser | null } | null)?.user ?? null)

        const payload = flipsData as BestFlipsResponse | Flip[] | null
        const safeFlips = Array.isArray(payload)
          ? (payload as Flip[])
          : Array.isArray((payload as BestFlipsResponse | null)?.flips)
            ? ((payload as BestFlipsResponse).flips as Flip[])
            : []

        const lastUpdated =
          !Array.isArray(payload) && typeof (payload as any)?.lastUpdated === "number"
            ? Number((payload as any).lastUpdated)
            : Date.now()

        setFlips(safeFlips)
        setLastUpdatedAt(lastUpdated)
      } catch (e: any) {
        setError(e?.message || "Failed to load live deals")
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [buySources])

  useEffect(() => {
    setUpdatedLabel(formatUpdatedSeconds(lastUpdatedAt))

    if (lastUpdatedAt === null) {
      return
    }

    const timer = window.setInterval(() => {
      setUpdatedLabel(formatUpdatedSeconds(lastUpdatedAt))
    }, updateIntervalMs)

    return () => window.clearInterval(timer)
  }, [lastUpdatedAt, updateIntervalMs])

  return (
    <main className="min-h-screen bg-transparent text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/8 topbar-blur">
        <div className="content-frame">
          <div className="flex min-h-[74px] items-center justify-between gap-4">
            <Link href="/" className="flex items-center">
              <img
                src="/stronka.png"
                alt="SkinFlip logo"
                className="h-8 w-auto object-contain"
              />
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {primaryNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <SteamLoginButton
                href="/api/auth/steam"
                iconSize={22}
                useButtonWrapper
                buttonClassName="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                anchorClassName="px-0 py-0"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 lg:hidden">
            {primaryNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      <div className="content-frame py-8 lg:py-10">
        <section className="surface-panel overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center">
            <div className="space-y-7">
              <div className="inline-flex w-fit items-center rounded-full border border-white/8 bg-white/4 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                Professional CS2 trading workflow
              </div>

              <div className="space-y-4">
                <h1 className="max-w-[12ch] text-4xl font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-5xl lg:text-[4.4rem]">
                  Find better CS2 flips with less noise
                </h1>
                <p className="max-w-[56ch] text-base leading-7 text-white/68 sm:text-lg">
                  Track live marketplace spreads, compare buy sources, and move from discovery to tracked execution inside one clean trading workspace.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  onClick={goToDeals}
                  className="h-12 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Open live board
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-sm text-muted-foreground">
                  Built around live profitability, liquidity, and sell timing.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Workflow
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">Scan to track</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Sources
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">CSFloat, Skinport, BUFF</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Typical profit
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">$5 to $25+</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/8 bg-white/4 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="section-heading">Market snapshot</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                    Live opportunities
                  </h2>
                </div>
                <div className="status-pill bg-background/70 px-3 py-1.5">
                  {updatedLabel}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {steps.map((step, index) => (
                  <div key={step.title} className="rounded-[1.4rem] border border-white/8 bg-background/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/5 text-primary">
                        <step.icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Step {index + 1}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-medium text-foreground">{step.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="live-board" className="py-8 lg:py-10">
          <div className="surface-panel rounded-[2rem] p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="section-heading">Live board</p>
                <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">
                  Current best flips
                </h2>
                <p className="max-w-[62ch] text-sm text-muted-foreground">
                  Review the same ranked board used in the app and choose which buy sources to include in the scan.
                </p>
              </div>
              <div className="status-pill text-sm">
                {updatedLabel}
              </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Buy from
              </span>
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={buySources.csfloat}
                  onCheckedChange={(v) => {
                    setBuySources((current) => ({ ...current, csfloat: Boolean(v) }))
                  }}
                />
                CSFloat
              </Label>
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={buySources.skinport}
                  onCheckedChange={(v) => {
                    setBuySources((current) => ({ ...current, skinport: Boolean(v) }))
                  }}
                />
                Skinport
              </Label>
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={buySources.buff}
                  onCheckedChange={(v) => {
                    setBuySources((current) => ({ ...current, buff: Boolean(v) }))
                  }}
                />
                BUFF
              </Label>
            </div>

            {loading ? (
              <div className="rounded-[1.6rem] border border-white/8 bg-white/4 p-8">
                <p className="text-lg font-semibold text-foreground">
                  Scanning market for new opportunities...
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The live board refreshes as profitable spreads are found across supported markets.
                </p>
              </div>
            ) : error ? (
              <div className="rounded-[1.6rem] border border-destructive/20 bg-destructive/6 p-8">
                <p className="text-lg font-semibold text-foreground">
                  Live board is temporarily unavailable
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              </div>
            ) : liveFlips.length === 0 ? (
              <div className="rounded-[1.6rem] border border-white/8 bg-white/4 p-8">
                <p className="text-lg font-semibold text-foreground">
                  No live opportunities found right now
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Adjust the selected buy sources or check again after the next scan.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {heroFlip ? (
                  <DealCard
                    {...heroFlip}
                    variant="landing"
                    featured
                    isBest
                    buyHref={getBuyHref(heroFlip) ?? undefined}
                    buyDisabled={!getBuyHref(heroFlip)}
                    onTrack={() => {
                      void trackFlip(heroFlip)
                    }}
                    isTracking={Boolean(trackingIds[heroFlip.id])}
                    isTracked={Boolean(trackedIds[heroFlip.id])}
                  />
                ) : null}

                {sideFlips.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {sideFlips.map((flip, index) => (
                      <DealCard
                        key={`live-${flip.id}-${index}`}
                        {...flip}
                        buyHref={getBuyHref(flip) ?? undefined}
                        buyDisabled={!getBuyHref(flip)}
                        onTrack={() => {
                          void trackFlip(flip)
                        }}
                        isTracking={Boolean(trackingIds[flip.id])}
                        isTracked={Boolean(trackedIds[flip.id])}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section id="how-it-works" className="py-2 lg:py-4">
          <div className="surface-panel rounded-[2rem] p-6 sm:p-8">
            <p className="section-heading">How it works</p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-[1.5rem] border border-white/8 bg-white/4 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-background/80 text-primary">
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Step {index + 1}
                    </div>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-white">{step.title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 lg:py-10">
          <div className="surface-panel rounded-[2rem] p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="section-heading">Next step</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                  Start working from live market data
                </h2>
                <p className="mt-2 max-w-[56ch] text-sm text-muted-foreground">
                  Open the board, review the top-ranked opportunities, and move only the flips worth tracking.
                </p>
              </div>

              <Button
                type="button"
                onClick={goToDeals}
                className="rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                See live deals
              </Button>
            </div>
          </div>
        </section>
      </div>

      <LegalFooter />
    </main>
  )
}
