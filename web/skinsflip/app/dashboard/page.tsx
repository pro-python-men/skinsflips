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
        <section className="surface-panel rounded-[2.1rem] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/75">
                Ranked live board
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white">
                Best opportunities right now
              </h1>
              <p className="max-w-[60ch] text-sm text-muted-foreground">
                Start with the highest-profit, fastest-selling flips first. The board ranks spreads by profit and overall sell quality.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-muted-foreground">
                {updatedLabel}
              </div>
              <Button type="button" variant="secondary" onClick={loadFlips} className="h-11 rounded-full px-5 text-sm">
                Refresh board
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-xs text-muted-foreground">
              Sources: {scanMeta?.enabledSources?.join(", ") || "available markets"}
            </div>
            <div className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-xs text-muted-foreground">
              Candidates checked: {scanMeta?.counts?.candidateRows ?? 0}
            </div>
            <div className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-xs text-muted-foreground">
              Opportunities found: {scanMeta?.counts?.opportunities ?? orderedFlips.length}
            </div>
            {rateLimited ? (
              <div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs text-amber-100">
                Some marketplace data was rate limited during this scan
              </div>
            ) : null}
          </div>
        </section>

        {loading ? (
          <div className="surface-panel rounded-[2rem] p-8 text-sm text-muted-foreground">
            Loading opportunities...
          </div>
        ) : error ? (
          <div className="surface-panel rounded-[2rem] border-destructive/20 p-8 text-sm text-destructive">
            {error}
          </div>
        ) : orderedFlips.length === 0 ? (
          <div className="surface-panel rounded-[2rem] p-8 text-center">
            <p className="text-lg font-semibold text-foreground">No profitable spreads found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Scan completed across {scanMeta?.enabledSources?.join(", ") || "available sources"}.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Checked {scanMeta?.counts?.candidateRows ?? 0} candidate items and found {scanMeta?.counts?.opportunities ?? 0} positive opportunities.
            </p>
            {scanMeta?.disabledSources?.length ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Skipped: {scanMeta.disabledSources.join(", ")}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {topFlip ? (
              <section className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/75">
                    First move
                  </div>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                    Highest-priority flip right now
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Best current mix of profit, confidence, and sell speed from the latest scan.
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
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/75">
                    Continue down the board
                  </div>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                    Next flips to check
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    If the top opportunity is gone, work through these next highest-ranked spreads.
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
