"use client"

import { useEffect, useState } from "react"
import { DealCard } from "@/components/deal-card"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { apiFetch, getBestFlips } from "@/lib/api"
import { DollarSign } from "lucide-react"
import type { Flip } from "@/lib/types/flip"

export default function BestFlipsPage() {
  const [flips, setFlips] = useState<Flip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [budget, setBudget] = useState("100")
  const [trackingId, setTrackingId] = useState<string | null>(null)

  const loadFlips = async () => {
    setLoading(true)
    setError("")

    try {
      const data = await getBestFlips()
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
          name: String(flip.name),
          buyPrice: Number(flip.buyPrice),
          sellPrice: Number(flip.sellPrice),
          profit: Number(flip.profit),
          roi: Number(flip.roi),
          sourceBuy: String(flip.sourceBuy),
          sourceSell: String(flip.sourceSell),
          listingCount:
            flip.listingCount == null ? undefined : Number(flip.listingCount),
          liquidity: flip.liquidity,
          confidence:
            flip.confidence == null ? undefined : Number(flip.confidence),
          eta: flip.eta == null ? undefined : String(flip.eta),
          createdAt:
            flip.createdAt == null ? undefined : String(flip.createdAt),
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
          skinName: flip.name,
          buyPrice: flip.buyPrice,
          sellPriceExpected: flip.sellPrice,
          sourceBuy: flip.sourceBuy,
          sourceSell: flip.sourceSell,
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
        description: flip.name,
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

  return (
    <DashboardLayout title="Best Flip Opportunities">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[0_24px_80px_-40px_rgba(16,185,129,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.12),transparent_34%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Best Flip Opportunities
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Only high-demand, fast-selling skins
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
            {flips.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-lg font-semibold text-foreground">No good opportunities right now</p>
                <p className="mt-2 text-sm text-muted-foreground">Check back later</p>
              </div>
            ) : null}

            {flips.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {flips.map((flip, index) => {
                  const isFeatured = index < 3

                  return (
                    <article
                      key={flip.id}
                      className={[
                        "group transition duration-200 hover:scale-[1.01]",
                        isFeatured
                          ? "xl:scale-[1.01] drop-shadow-[0_20px_60px_rgba(34,197,94,0.18)]"
                          : "",
                        index === 0 ? "xl:col-span-2" : "",
                      ].join(" ")}
                    >
                      <div className="flex h-full flex-col justify-between gap-3">
                        {isFeatured ? (
                          <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
                            Top Opportunity
                          </div>
                        ) : null}

                        <DealCard
                          {...flip}
                          onTrack={() => handleTrackFlip(flip)}
                          isTracking={trackingId === flip.id}
                          featured={index === 0}
                          isBest={index === 0}
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : null}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Prices are estimated from recent sales data
        </div>
      </div>
    </DashboardLayout>
  )
}
