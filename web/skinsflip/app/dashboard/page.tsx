"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DealCard } from "@/components/deal-card"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api"
import type { BestFlipsResponse, Flip } from "@/lib/types/flip"

function formatUpdatedSeconds(lastUpdatedAt: number | null) {
  if (lastUpdatedAt === null) {
    return "Updated just now"
  }

  const seconds = Math.max(0, Math.floor((Date.now() - lastUpdatedAt) / 1000))
  const label = seconds === 1 ? "second" : "seconds"
  return `Updated ${seconds} ${label} ago`
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading: isLoadingAuth } = useAuth()
  const updateIntervalMs = 15000
  const [flips, setFlips] = useState<Flip[]>([])
  const [trackedIds, setTrackedIds] = useState<Record<string, boolean>>({})
  const [trackingIds, setTrackingIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [updatedLabel, setUpdatedLabel] = useState("Updated just now")
  const [scanMeta, setScanMeta] = useState<BestFlipsResponse["scanMeta"]>(null)
  const [rateLimited, setRateLimited] = useState(false)

  const orderedFlips = useMemo(() => {
    return [...flips].sort((a, b) => {
      const rankA = Number(a.rankScore ?? 0)
      const rankB = Number(b.rankScore ?? 0)
      const profitA = Number(a.profit ?? 0)
      const profitB = Number(b.profit ?? 0)
      return rankB - rankA || profitB - profitA
    })
  }, [flips])

  const topFlip = orderedFlips[0] ?? null
  const nextFlips = orderedFlips.slice(1)

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

  const loadFlips = async () => {
    setLoading(true)
    setError("")

    try {
      const flipsData = await apiFetch("/api/flips/best")
      const payload = flipsData as BestFlipsResponse | Flip[] | null
      const safeFlips = Array.isArray(payload)
        ? (payload as Flip[])
        : Array.isArray((payload as BestFlipsResponse | null)?.flips)
          ? ((payload as BestFlipsResponse).flips as Flip[])
          : []
      const nextScanMeta = !Array.isArray(payload) ? (payload as BestFlipsResponse | null)?.scanMeta ?? null : null
      const nextRateLimited =
        !Array.isArray(payload) ? Boolean((payload as BestFlipsResponse | null)?.rateLimited) : false

      const lastUpdated =
        !Array.isArray(payload) && typeof (payload as any)?.lastUpdated === "number"
          ? Number((payload as any).lastUpdated)
          : Date.now()

      setFlips(safeFlips)
      setScanMeta(nextScanMeta)
      setRateLimited(nextRateLimited)
      setLastUpdatedAt(lastUpdated)
    } catch (e: any) {
      setError(e?.message || "Failed to load best opportunities")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return
    loadFlips()
  }, [isAuthenticated, isLoadingAuth])

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
    <DashboardLayout title="Best opportunities right now" requireAuth>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Best opportunities right now
            </h1>
            <p className="text-sm text-muted-foreground">
              Start with the highest-profit, fastest-selling flips first.
            </p>
            <p className="text-sm text-muted-foreground">{updatedLabel}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
            <Button type="button" variant="secondary" onClick={loadFlips} className="h-10 px-4 text-sm">
              Refresh
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading opportunities...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-card p-6 text-sm text-destructive">
            {error}
          </div>
        ) : orderedFlips.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-lg font-semibold text-foreground">No profitable spreads found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Scan completed across {scanMeta?.enabledSources?.join(", ") || "available sources"}.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Checked {scanMeta?.counts?.candidateRows ?? 0} candidate items and found{" "}
              {scanMeta?.counts?.opportunities ?? 0} positive opportunities.
            </p>
            {rateLimited ? (
              <p className="mt-2 text-xs text-amber-300">
                Some marketplace data was rate limited during this scan.
              </p>
            ) : null}
            {scanMeta?.disabledSources?.length ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Skipped: {scanMeta.disabledSources.join(", ")}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {topFlip ? (
              <section className="space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                    Start here
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Highest-priority flip right now
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Best mix of profit, sell speed, and confidence from the current live scan.
                  </p>
                </div>

                <DealCard
                  {...topFlip}
                  featured
                  isBest
                  buyHref={getBuyHref(topFlip) ?? undefined}
                  buyDisabled={!getBuyHref(topFlip)}
                  onTrack={() => {
                    void trackFlip(topFlip)
                  }}
                  isTracking={Boolean(trackingIds[topFlip.id])}
                  isTracked={Boolean(trackedIds[topFlip.id])}
                />
              </section>
            ) : null}

            {nextFlips.length > 0 ? (
              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-foreground">
                    Next flips to check
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Move down this list after the top opportunity.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {nextFlips.map((flip) => (
                    <DealCard
                      key={flip.id}
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
              </section>
            ) : null}
          </>
        )}
      </div>

    </DashboardLayout>
  )
}
