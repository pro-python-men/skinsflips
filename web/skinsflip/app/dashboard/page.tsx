"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DealCard } from "@/components/deal-card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api"
import type { BestFlipsResponse, Flip } from "@/lib/types/flip"

type RiskMode = "conservative" | "balanced" | "aggressive"

const riskModeDescriptions: Record<RiskMode, string> = {
  conservative: "High liquidity, higher ROI threshold",
  balanced: "Default profit and liquidity filters",
  aggressive: "Lower thresholds, includes low liquidity",
}

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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [maxBuyPriceUsd, setMaxBuyPriceUsd] = useState(() => {
    try {
      if (typeof window === "undefined") return ""
      return window.localStorage.getItem("bestFlipsMaxBuyPriceUsd") || ""
    } catch {
      return ""
    }
  })
  const [riskMode, setRiskMode] = useState<RiskMode>(() => {
    try {
      if (typeof window === "undefined") return "balanced"
      const savedMode = window.localStorage.getItem("bestFlipsRiskMode")
      if (savedMode === "conservative" || savedMode === "balanced" || savedMode === "aggressive") {
        return savedMode
      }
      return (window.localStorage.getItem("bestFlipsRelaxFilters") || "") === "1"
        ? "aggressive"
        : "balanced"
    } catch {
      return "balanced"
    }
  })
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

  useEffect(() => {
    try {
      const value = maxBuyPriceUsd.trim()
      if (value) window.localStorage.setItem("bestFlipsMaxBuyPriceUsd", value)
      else window.localStorage.removeItem("bestFlipsMaxBuyPriceUsd")
    } catch {
      // ignore
    }
  }, [maxBuyPriceUsd])

  useEffect(() => {
    try {
      window.localStorage.setItem("bestFlipsRiskMode", riskMode)
      window.localStorage.removeItem("bestFlipsRelaxFilters")
    } catch {
      // ignore
    }
  }, [riskMode])

  useEffect(() => {
    try {
      window.localStorage.setItem("bestFlipsBuySources", JSON.stringify(buySources))
    } catch {
      // ignore
    }
  }, [buySources])

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

  const buySourcesCsv = useMemo(() => {
    const selected = Object.entries(buySources)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key)
    if (selected.length === 0) return "csfloat"
    return selected.join(",")
  }, [buySources])

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
      const budget = maxBuyPriceUsd.trim()
      const params = new URLSearchParams()
      if (budget) params.set("maxBuyPrice", budget)
      if (buySourcesCsv) params.set("buySources", buySourcesCsv)
      params.set("mode", riskMode)
      const qs = params.toString() ? `?${params.toString()}` : ""
      const flipsData = await apiFetch(`/api/flips/best${qs}`)
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
      setError(e?.message || "Failed to load best opportunities")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return
    loadFlips()
  }, [buySourcesCsv, isAuthenticated, isLoadingAuth, riskMode])

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
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Max buy ($)</span>
              <Input
                inputMode="decimal"
                type="number"
                min={0}
                step={1}
                value={maxBuyPriceUsd}
                onChange={(e) => setMaxBuyPriceUsd(e.target.value)}
                className="h-9 w-24 sm:w-28"
                placeholder="e.g. 250"
              />
            </div>

            <Button type="button" variant="secondary" onClick={loadFlips} className="h-10 px-4 text-sm">
              Refresh
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvancedSettings(true)}
              className="h-10 px-4 text-sm"
            >
              Advanced settings
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
            <p className="text-lg font-semibold text-foreground">No good deals right now</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This is normal - profitable opportunities appear constantly
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Try again in a few minutes</p>
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

      {/* Advanced Settings Dialog */}
      <Dialog open={showAdvancedSettings} onOpenChange={setShowAdvancedSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Advanced Settings</DialogTitle>
            <DialogDescription>
              Configure your trading strategy and buy sources.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Strategy Mode */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="mode-select" className="text-sm font-semibold text-foreground">
                  Strategy Mode
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {riskModeDescriptions[riskMode]}
                </p>
              </div>
              <Select value={riskMode} onValueChange={(value) => setRiskMode(value as RiskMode)}>
                <SelectTrigger id="mode-select" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Buy Sources */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Buy Sources</Label>
              <div className="space-y-2">
                <Label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={buySources.csfloat}
                    onCheckedChange={(v) => {
                      setBuySources((current) => ({ ...current, csfloat: Boolean(v) }))
                    }}
                  />
                  <span className="text-sm text-muted-foreground">CSFloat</span>
                </Label>
                <Label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={buySources.skinport}
                    onCheckedChange={(v) => {
                      setBuySources((current) => ({ ...current, skinport: Boolean(v) }))
                    }}
                  />
                  <span className="text-sm text-muted-foreground">Skinport</span>
                </Label>
                <Label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={buySources.buff}
                    onCheckedChange={(v) => {
                      setBuySources((current) => ({ ...current, buff: Boolean(v) }))
                    }}
                  />
                  <span className="text-sm text-muted-foreground">BUFF</span>
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvancedSettings(false)}
              className="h-10"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
