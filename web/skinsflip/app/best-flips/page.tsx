"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"
import { formatCurrency } from "@/lib/format"

type Flip = {
  id: string
  skin: string
  buyPrice: number
  sellPrice: number
  profit: number
  roi: number
  source: string
}

export default function BestFlipsPage() {
  const [flips, setFlips] = useState<Flip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [budget, setBudget] = useState(100)

  const filteredFlips = useMemo(() => {
    return flips
      .filter((flip) => flip.buyPrice <= budget)
      .sort((a, b) => b.roi - a.roi)
  }, [budget, flips])

  const fallbackFlips = useMemo(() => {
    return [...flips]
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5)
  }, [flips])

  const displayFlips =
    filteredFlips.length > 0 ? filteredFlips : fallbackFlips

  const loadFlips = async () => {
    setLoading(true)
    setError("")

    try {
      const data = await apiFetch("/api/flips/best")
      if (!data || (Array.isArray(data) && data.length === 0)) {
        setFlips([])
        return
      }

      if (!Array.isArray(data)) {
        throw new Error("Nieoczekiwana odpowiedź serwera")
      }

      setFlips(
        data.map((flip) => ({
          id: String(flip.id),
          skin: String(flip.skin),
          buyPrice: Number(flip.buyPrice),
          sellPrice: Number(flip.sellPrice),
          profit: Number(flip.profit),
          roi: Number(flip.roi),
          source: String(flip.source ?? ""),
        }))
      )
    } catch (e: any) {
      setError(e?.message || "Failed to load best flips")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFlips()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getRoiColor = (roi: number) => {
    if (roi > 10) return "bg-emerald-500/20 text-emerald-400"
    if (roi > 0) return "bg-yellow-500/20 text-yellow-400"
    return "bg-red-500/20 text-red-400"
  }

  const mockFlips = [
    {
      name: "AK-47 | Redline",
      buy: 45,
      sell: 57
    },
    {
      name: "AWP | Asiimov",
      buy: 120,
      sell: 145
    },
    {
      name: "M4A1-S | Printstream",
      buy: 90,
      sell: 108
    },
    {
      name: "Glock-18 | Gamma Doppler",
      buy: 60,
      sell: 74
    }
  ];

  return (
    <DashboardLayout title="Top Opportunities">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[0_24px_80px_-40px_rgba(16,185,129,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.12),transparent_34%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge className="w-fit border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">
                🔥 Best deals right now
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Best Flips
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Find the most profitable CS2 skin deals based on recent market activity.
                </p>
              </div>
            </div>

            <Button variant="secondary" size="sm" onClick={loadFlips} className="w-full sm:w-auto">
              Refresh scan
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Your budget:</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-24 rounded-md border border-border bg-card px-3 py-1 pl-7 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-border bg-card p-6 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-emerald-400" />
            <p className="mt-4 text-sm text-muted-foreground">Scanning markets...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFlips.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                Showing best deals overall
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              {displayFlips.map((flip, index) => {
                const isFeatured = index < 3
                const profit = flip.sellPrice - flip.buyPrice

                return (
                  <article
                    key={flip.id}
                    className={[
                      "group rounded-xl border border-border bg-card p-5 transition duration-200 hover:scale-[1.01]",
                      isFeatured
                        ? "border-green-500/30 shadow-[0_20px_60px_-35px_rgba(34,197,94,0.55)]"
                        : "hover:border-emerald-500/20 hover:shadow-[0_18px_45px_-35px_rgba(34,197,94,0.35)]",
                      index === 0 ? "xl:col-span-2" : "",
                    ].join(" ")}
                  >
                    <div className="flex h-full flex-col gap-5">
                      {isFeatured ? (
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
                          Top Opportunity
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-lg font-semibold text-foreground">
                              {flip.skin}
                            </h2>
                            <Badge className="border border-border/80 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                              {flip.source}
                            </Badge>
                          </div>

                          <p className="text-2xl font-bold text-emerald-400">
                            + ${profit.toFixed(2)}
                          </p>

                          <p className="text-sm text-muted-foreground">
                            Buy ${flip.buyPrice.toFixed(2)} {"\u2192"} Sell ${flip.sellPrice.toFixed(2)}
                          </p>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                Market price
                              </div>
                              <div className="mt-2 text-lg font-semibold text-foreground">
                                {formatCurrency(flip.buyPrice)}
                              </div>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                Estimated sell price
                              </div>
                              <div className="mt-2 text-lg font-semibold text-foreground">
                                {formatCurrency(flip.sellPrice)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-3 lg:min-w-[180px] lg:items-end">
                          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${getRoiColor(flip.roi)}`}>
                            Return {flip.roi.toFixed(1)}%
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Based on recent sales
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto flex justify-end">
                        <button className="rounded-xl bg-green-500 px-5 py-2.5 font-semibold text-black transition hover:bg-green-600">
                          View deal
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold">
            🔥 Today’s best opportunities
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockFlips.map((flip, index) => {
              const profit = flip.sell - flip.buy;

              return (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
                >
                  <p className="font-medium">
                    {flip.name}
                  </p>

                  <p className="text-2xl font-bold text-emerald-400">
                    + ${profit.toFixed(2)}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Buy ${flip.buy} → Sell ${flip.sell}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Based on recent sales
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            More deals coming soon...
          </p>
        </div>

        <div className="text-sm text-muted-foreground">
          Prices are estimated from recent sales data
        </div>
      </div>
    </DashboardLayout>
  )
}
