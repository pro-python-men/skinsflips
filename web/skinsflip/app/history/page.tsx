"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { apiFetch } from "@/lib/api"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HistoryFilters } from "@/components/history-filters"
import { toast } from "@/hooks/use-toast"
import { formatCurrency, formatPercent } from "@/lib/format"
import { CheckCircle2, History } from "lucide-react"

type TrackedFlip = {
  id: string
  skinName: string
  buyPrice: number
  sellPriceExpected: number
  sellPriceActual: number | null
  profitExpected: number
  profitActual: number | null
  sourceBuy: string
  sourceSell: string
  status: "tracked" | "completed"
  roiExpected: number
  roiActual: number | null
  createdAt: string
  completedAt: string | null
}

function HistorySummaryCard({
  title,
  value,
  description,
  tone = "default",
  helper,
}: {
  title: string
  value: string
  description: string
  tone?: "default" | "profit"
  helper?: string
}) {
  return (
    <div
      className={[
        "surface-panel rounded-[1.8rem] p-6",
        tone === "profit" ? "shadow-[0_20px_60px_-35px_rgba(52,211,153,0.45)]" : "",
      ].join(" ")}
    >
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p
        className={[
          "mt-3 font-semibold tracking-[-0.05em]",
          tone === "profit" ? "text-4xl text-emerald-300" : "text-3xl text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
      {helper ? <p className="mt-2 text-sm text-emerald-300">{helper}</p> : null}
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function parseEtaDays(etaText: string | null | undefined) {
  if (!etaText) return 7
  const match = String(etaText).match(/(\d+)/)
  if (!match) return 7
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : 7
}

function getTrackedProgress(flip: TrackedFlip) {
  const totalDays = parseEtaDays((flip as TrackedFlip & { eta?: string }).eta)
  const createdAtMs = new Date(flip.createdAt).getTime()
  const nowMs = Date.now()
  const elapsedDays = Math.max(0, Math.floor((nowMs - createdAtMs) / (1000 * 60 * 60 * 24)))
  const dayInJourney = Math.min(totalDays, elapsedDays + 1)
  const progressPercent = Math.min(100, Math.round((dayInJourney / totalDays) * 100))

  if (elapsedDays >= totalDays) {
    return {
      badge: "Ready to sell",
      helper: "Your expected sell window is here.",
      progressLabel: `Day ${totalDays} / ${totalDays}`,
      progressPercent: 100,
      etaLabel: "Sell window reached",
      tone: "ready" as const,
    }
  }

  return {
    badge: `Day ${dayInJourney} / ${totalDays}`,
    helper: "Holding for the expected profit window.",
    progressLabel: `${totalDays - elapsedDays} day${totalDays - elapsedDays === 1 ? "" : "s"} left`,
    progressPercent,
    etaLabel: `Estimated sell time: ~${totalDays} days`,
    tone: "holding" as const,
  }
}

export default function HistoryPage() {
  const { isAuthenticated, isLoading: isLoadingAuth } = useAuth()
  const [dateRange, setDateRange] = useState("All Time")
  const [weapon, setWeapon] = useState("All Weapons")
  const [profitFilter, setProfitFilter] = useState("All")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [flips, setFlips] = useState<TrackedFlip[]>([])
  const [sellValues, setSellValues] = useState<Record<string, string>>({})
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalProfit: 0,
    averageROI: 0,
    totalFlips: 0,
  })

  const refresh = async () => {
    setLoading(true)
    setError("")

    try {
      const data = await apiFetch("/api/flips/my")

      if (data === null) {
        setFlips([])
        setStats({ totalProfit: 0, averageROI: 0, totalFlips: 0 })
        return
      }

      const normalized = Array.isArray(data) ? (data as TrackedFlip[]) : []
      setFlips(normalized)

      const completed = normalized.filter((flip) => flip.status === "completed" && flip.profitActual !== null)
      const totalProfit = completed.reduce((sum, flip) => sum + Number(flip.profitActual ?? 0), 0)
      const averageROI =
        completed.length > 0
          ? completed.reduce((sum, flip) => sum + Number(flip.roiActual ?? 0), 0) / completed.length
          : 0

      setStats({
        totalProfit,
        averageROI,
        totalFlips: completed.length,
      })
    } catch (e: any) {
      setError(e?.message || "Failed to load history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return
    refresh()
  }, [isAuthenticated, isLoadingAuth])

  const filteredFlips = useMemo(() => {
    return flips.filter((flip) => {
      if (weapon !== "All Weapons") {
        const skinWeapon = flip.skinName.split(" | ")[0]
        if (skinWeapon !== weapon) return false
      }

      const referenceDate = new Date(flip.completedAt ?? flip.createdAt)
      const now = new Date()
      const diffDays = (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)

      if (dateRange === "Last 7 Days" && diffDays > 7) return false
      if (dateRange === "Last 30 Days" && diffDays > 30) return false
      if (dateRange === "Last 90 Days" && diffDays > 90) return false
      if (dateRange === "This Year" && referenceDate.getFullYear() !== now.getFullYear()) return false

      const profitValue =
        flip.status === "completed" ? Number(flip.profitActual ?? 0) : Number(flip.profitExpected)

      if (profitFilter === "Profitable Only" && profitValue < 0) return false
      if (profitFilter === "Losses Only" && profitValue >= 0) return false

      return true
    })
  }, [dateRange, flips, profitFilter, weapon])

  const activeFlips = filteredFlips.filter((flip) => flip.status === "tracked")
  const completedFlips = filteredFlips.filter((flip) => flip.status === "completed")
  const trackedCount = flips.filter((flip) => flip.status === "tracked").length

  const handleCompleteFlip = async (flip: TrackedFlip) => {
    if (!/^\d+$/.test(String(flip.id))) {
      toast({
        title: "Could not update flip",
        description: `Invalid flip id: ${String(flip.id)}`,
        variant: "destructive",
      })
      return
    }

    const currentValue = sellValues[flip.id] ?? String(flip.sellPriceExpected)
    const numericValue = Number(currentValue)

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      toast({
        title: "Enter sell price",
        description: "Provide a valid sale price to complete this flip.",
        variant: "destructive",
      })
      return
    }

    setCompletingId(flip.id)

    try {
      await apiFetch(`/api/flips/${flip.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellPriceActual: numericValue }),
      })

      toast({
        title: "Flip marked as sold",
        description: flip.skinName,
      })

      setSellValues((current) => {
        const next = { ...current }
        delete next[flip.id]
        return next
      })

      await refresh()
    } catch (e: any) {
      toast({
        title: "Could not update flip",
        description: e?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setCompletingId(null)
    }
  }

  const renderEmptyState = (title: string, description: string) => (
    <div className="surface-panel rounded-[2rem] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/6">
        <History className="h-5 w-5 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Button asChild className="mt-6 rounded-full bg-[#dfffc0] px-5 text-black hover:bg-[#cbff9e]">
        <Link href="/best-flips">Go to Best Flips</Link>
      </Button>
    </div>
  )

  const formatDisplayDate = (value: string | null) =>
    new Date(value ?? new Date().toISOString()).toLocaleDateString("pl-PL")

  return (
    <DashboardLayout title="Tracking" requireAuth>
      <div className="space-y-6">
        <section className="surface-panel rounded-[2.1rem] p-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/75">
              Trading journal
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white">
              Track active flips and realized exits
            </h1>
            <p className="max-w-[62ch] text-sm text-muted-foreground">
              This view helps you manage current holds, mark completed sells, and review actual performance over time.
            </p>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <HistorySummaryCard
            title="Total Profit"
            value={formatCurrency(stats.totalProfit)}
            helper={`${stats.totalProfit >= 0 ? "+" : ""}${formatCurrency(stats.totalProfit)} realized`}
            description="All realized profit from completed flips"
            tone="profit"
          />
          <HistorySummaryCard
            title="Average ROI"
            value={formatPercent(stats.averageROI, 1)}
            description="Average return per completed flip"
          />
          <HistorySummaryCard
            title="Total Flips"
            value={stats.totalFlips.toString()}
            description="Completed trades recorded so far"
          />
        </div>

        <HistoryFilters
          dateRange={dateRange}
          weapon={weapon}
          profitFilter={profitFilter}
          onDateRangeChange={setDateRange}
          onWeaponChange={setWeapon}
          onProfitFilterChange={setProfitFilter}
        />

        {error ? (
          <div className="surface-panel rounded-[1.8rem] border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="surface-panel rounded-[1.8rem] p-5 text-sm text-muted-foreground">
            Loading flips...
          </div>
        ) : null}

        {!loading && flips.length === 0 ? (
          renderEmptyState(
            "You are not tracking any flips yet",
            "Go to Best Flips and start tracking profitable opportunities."
          )
        ) : null}

        {!loading && flips.length > 0 && filteredFlips.length === 0 ? (
          <div className="surface-panel rounded-[1.8rem] p-8 text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">No flips match your filters</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Adjust the filter mix to reveal more of your trading activity.
            </p>
          </div>
        ) : null}

        {!loading && filteredFlips.length > 0 ? (
          <section className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                  Your trading activity
                </h2>
                <p className="text-sm text-muted-foreground">
                  {trackedCount} active tracked flips and {completedFlips.length} completed flips in view
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Active flips</h3>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  {activeFlips.length} tracking
                </span>
              </div>

              {activeFlips.length === 0 ? (
                <div className="surface-panel rounded-[1.8rem] p-6 text-sm text-muted-foreground">
                  No active flips for the current filters.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {activeFlips.map((flip) => {
                    const progress = getTrackedProgress(flip)

                    return (
                      <article
                        key={flip.id}
                        className="surface-panel rounded-[1.9rem] p-6 transition hover:-translate-y-1"
                      >
                        <div className="flex h-full flex-col gap-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                              <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">{flip.skinName}</h3>
                              <p className="text-sm text-muted-foreground">
                                Buy {formatCurrency(flip.buyPrice)} {"\u2192"} Expected sell {formatCurrency(flip.sellPriceExpected)}
                              </p>
                            </div>

                            <span
                              className={[
                                "rounded-full px-3 py-1 text-xs font-medium",
                                progress.tone === "ready"
                                  ? "border border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                                  : "border border-amber-300/20 bg-amber-300/10 text-amber-100",
                              ].join(" ")}
                            >
                              {progress.badge}
                            </span>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/5 p-4">
                              <p className="text-sm text-muted-foreground">Potential profit</p>
                              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-emerald-300">
                                {flip.profitExpected >= 0 ? "+" : ""}
                                {formatCurrency(flip.profitExpected)}
                              </p>
                              <p className="mt-2 text-sm text-emerald-100/80">
                                Still waiting to be realized
                              </p>
                            </div>

                            <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
                              <p className="text-sm text-muted-foreground">Sell journey</p>
                              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">{progress.progressLabel}</p>
                              <p className="mt-2 text-sm text-muted-foreground">{progress.etaLabel}</p>
                            </div>
                          </div>

                          <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-medium text-foreground">{progress.helper}</span>
                              <span className="text-muted-foreground">{progress.progressPercent}%</span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                              <div
                                className="h-full rounded-full bg-emerald-400 transition-all"
                                style={{ width: `${progress.progressPercent}%` }}
                              />
                            </div>
                            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                              <span>Buy on {flip.sourceBuy}</span>
                              <span>Sell on {flip.sourceSell}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={sellValues[flip.id] ?? String(flip.sellPriceExpected)}
                              onChange={(e) =>
                                setSellValues((current) => ({
                                  ...current,
                                  [flip.id]: e.target.value.replace(/[^0-9.]/g, ""),
                                }))
                              }
                              className="rounded-2xl border-white/10 bg-white/4 sm:max-w-[180px]"
                              placeholder="Actual sell price"
                            />
                            <Button
                              type="button"
                              onClick={() => handleCompleteFlip(flip)}
                              disabled={completingId === flip.id}
                              className="rounded-full bg-[#dfffc0] text-black hover:bg-[#cbff9e]"
                            >
                              {completingId === flip.id ? "Saving..." : progress.tone === "ready" ? "Sell now" : "Mark as sold"}
                            </Button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Completed flips</h3>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {completedFlips.length} completed
                </span>
              </div>

              {completedFlips.length === 0 ? (
                <div className="surface-panel rounded-[1.8rem] p-6 text-sm text-muted-foreground">
                  No completed flips yet. Sell one of your tracked flips to unlock realized profit stats.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {completedFlips.map((flip) => (
                    <article
                      key={flip.id}
                      className="surface-panel rounded-[1.9rem] p-6 transition hover:-translate-y-1"
                    >
                      <div className="flex h-full flex-col gap-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">{flip.skinName}</h3>
                            <p className="text-sm text-muted-foreground">
                              Buy {formatCurrency(flip.buyPrice)} {"\u2192"} Sell {formatCurrency(flip.sellPriceActual ?? 0)}
                            </p>
                          </div>

                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </div>

                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Real profit</p>
                            <p className="text-3xl font-semibold tracking-[-0.05em] text-emerald-300">
                              {(flip.profitActual ?? 0) >= 0 ? "+" : ""}
                              {formatCurrency(flip.profitActual ?? 0)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">ROI</p>
                            <p className="text-xl font-semibold text-foreground">
                              {formatPercent(flip.roiActual ?? 0, 0)}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-white/8 pt-4 text-sm text-muted-foreground">
                          <p>Buy on {flip.sourceBuy} | Sell on {flip.sourceSell}</p>
                          <p className="mt-1">Date: {formatDisplayDate(flip.completedAt ?? flip.createdAt)}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
