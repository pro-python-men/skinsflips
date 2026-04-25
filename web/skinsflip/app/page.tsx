"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, DollarSign, Search, TrendingUp } from "lucide-react"
import { DealCard } from "@/components/deal-card"
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
    title: "Buy from cheaper marketplace",
    icon: DollarSign,
  },
  {
    title: "Sell for profit",
    icon: TrendingUp,
  },
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
  const heroFlips = flips.slice(0, 3)
  const liveFlips = flips.slice(0, 5)

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
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-[64px] w-full max-w-7xl items-center justify-between px-6 lg:px-10">
          <a href="/" className="flex items-center">
            <img
              src="/stronka.png"
              alt="SkinFlip logo"
              className="h-9 w-auto object-contain lg:h-10"
            />
          </a>

          <div className="flex items-center">
            <a
              href="/login"
              className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:scale-105 hover:bg-white/10"
            >
              <img
                src="/steam.png"
                alt=""
                className="h-7 w-7 object-contain lg:h-8 lg:w-8"
              />
              Login with Steam
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-[url('/awp-hero.png')] bg-cover bg-[72%_center] bg-no-repeat py-16 sm:py-18 lg:min-h-[64vh] lg:py-20">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.82)_30%,rgba(0,0,0,0.52)_56%,rgba(0,0,0,0.12)_100%)]" />

          <div className="relative mx-auto flex min-h-[440px] max-w-[1240px] items-center px-6 sm:px-8 lg:min-h-[64vh] lg:px-10">
            <div className="flex max-w-[560px] flex-col gap-6 lg:max-w-[600px]">
              <div className="inline-flex w-fit items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Based on real sales data
              </div>

              <div className="flex flex-col gap-4">
                <h1 className="text-4xl font-bold leading-[0.98] tracking-tight text-white sm:text-5xl lg:text-[4rem]">
                  Find profitable CS2 skin flips in seconds
                </h1>
                <p className="text-sm font-medium text-green-400 sm:text-base">
                  Average flips: $5-$25 profit per trade
                </p>
                <p className="max-w-[52ch] text-base leading-7 text-white/72 sm:text-lg">
                  See exactly what to buy, where to buy it, and how much profit you’ll make — based on real sales data.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  onClick={goToDeals}
                  className="h-14 rounded-xl bg-green-500 px-8 text-base font-semibold text-black shadow-[0_18px_50px_rgba(34,197,94,0.28)] transition hover:bg-green-600"
                >
                  Find profitable flips
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-sm text-white/60">
                  Powered by real marketplace data
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 lg:py-10">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold tracking-tight text-white">Live opportunities</h2>
            <p className="mt-1 text-sm text-muted-foreground">{updatedLabel}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Buy from</span>
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
          </div>

          {loading || error || liveFlips.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-8">
              <p className="text-lg font-semibold text-foreground">Scanning market for new opportunities...</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Live flips update continuously as new profitable gaps are detected.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {liveFlips.map((flip, index) => (
                <DealCard
                  key={`live-${flip.id}-${index}`}
                  {...flip}
                  variant="landing"
                  featured={index === 0}
                  isBest={index === 0}
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
          )}
        </section>

        <section className="py-8 lg:py-10">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
              How it works
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-border/60 bg-background p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Start finding profitable skins
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Based on real sales data</p>

            <div className="mt-6">
              <Button
                type="button"
                onClick={goToDeals}
                className="rounded-xl bg-green-500 px-6 py-6 text-base font-semibold text-black transition hover:bg-green-600"
              >
                See live deals
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
