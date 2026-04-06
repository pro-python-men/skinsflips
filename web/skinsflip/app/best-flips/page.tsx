"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api"
import { DollarSign } from "lucide-react"

type Flip = {
  id: string
  skin: string
  buyPrice: number
  sellPrice: number
  profit: number
  roi: number
  source: string
  sourceBuy: string
  sourceSell: string
}

export default function BestFlipsPage() {
  const [flips, setFlips] = useState<Flip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [budget, setBudget] = useState("100")
  const [trackingId, setTrackingId] = useState<string | null>(null)

  const filteredFlips = useMemo(() => {
    const numericBudget = Number(budget || 0)

    return flips
      .filter((flip) => flip.buyPrice <= numericBudget)
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
          sourceBuy: String(flip.sourceBuy ?? ""),
          sourceSell: String(flip.sourceSell ?? ""),
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

  const handleTrackFlip = async (flip: Flip) => {
    setTrackingId(flip.id)

    try {
      const data = await apiFetch("/api/flips/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skinName: flip.skin,
          buyPrice: flip.buyPrice,
          sellPriceExpected: flip.sellPrice,
          sourceBuy: flip.sourceBuy || "Skinport",
          sourceSell: flip.sourceSell || "Buff163",
        }),
      })

      if (data === null) {
        toast({
          title: "Login with Steam",
          description: "You need to log in before tracking flips.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Flip added to your tracker",
        description: flip.skin,
      })
    } catch (e: any) {
      toast({
        title: "Could not track flip",
        description: e?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setTrackingId(null)
    }
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
              <div className="w-fit rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">
                🔥 Best deals right now
              </div>
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

        <div className="mt-4 space-y-2">
          <label htmlFor="budget" className="block text-sm font-medium text-muted-foreground">
            Enter your budget
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="budget"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={budget}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "")

                  if (value.startsWith("0") && value.length > 1) {
                    setBudget(value.replace(/^0+/, ""))
                  } else {
                    setBudget(value)
                  }
                }}
                onFocus={() => {
                  if (budget === "100") {
                    setBudget("")
                  }
                }}
                onBlur={() => {
                  if (budget === "") {
                    setBudget("100")
                  }
                }}
                placeholder="100"
                className="bg-card pl-10"
              />
            </div>

            <Button type="button" className="w-full sm:w-auto">
              Show Best Deals
            </Button>
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
                    <div className="flex h-full flex-col justify-between gap-6">
                      {isFeatured ? (
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
                          Top Opportunity
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-3">
                          <h2 className="text-lg font-semibold text-foreground">
                            {flip.skin}
                          </h2>

                          <p className="text-sm text-muted-foreground">
                            Buy ${flip.buyPrice.toFixed(2)} {"\u2192"} Sell ${flip.sellPrice.toFixed(2)}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Buy on {flip.sourceBuy || "market"} • Sell on {flip.sourceSell || "Steam Market"}
                          </p>
                        </div>

                        <p className="text-4xl font-bold text-emerald-400 lg:text-right">
                          + ${profit.toFixed(2)}
                        </p>
                      </div>

                      <div className="mt-auto flex justify-end">
                        <Button
                          type="button"
                          onClick={() => handleTrackFlip(flip)}
                          disabled={trackingId === flip.id}
                          className="rounded-xl bg-green-500 px-5 py-2.5 font-semibold text-black transition hover:bg-green-600"
                        >
                          {trackingId === flip.id ? "Tracking..." : "Track this flip"}
                        </Button>
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
