"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"
import { formatCurrency, formatPercent } from "@/lib/format"

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
  const router = useRouter()
  const [flips, setFlips] = useState<Flip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const mockFlips: Flip[] = [
    {
      id: "1",
      skin: "AK-47 | Redline",
      buyPrice: 10,
      sellPrice: 15,
      profit: 5,
      roi: 50,
      source: "Skinport"
    },
    {
      id: "2",
      skin: "AWP | Asiimov",
      buyPrice: 80,
      sellPrice: 95,
      profit: 15,
      roi: 18.75,
      source: "Steam"
    },
    {
      id: "3",
      skin: "M4A1-S | Printstream",
      buyPrice: 120,
      sellPrice: 150,
      profit: 30,
      roi: 25,
      source: "Buff"
    }
  ];

  const sortedFlips = useMemo(() => {
    return [...flips].sort((a, b) => b.roi - a.roi)
  }, [flips])

  const loadFlips = async () => {
    setLoading(true)
    setError("")

    try {
      const data = await apiFetch("/api/flips/best")
      if (!data || (Array.isArray(data) && data.length === 0)) {
        setFlips(mockFlips)
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

  return (
    <DashboardLayout title="Best Flips">
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Best flipping opportunities based on ROI
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading best flips...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : sortedFlips.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No flips available.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold">Best flips</h1>
              <Button variant="secondary" size="sm" onClick={loadFlips}>
                Refresh
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedFlips.map((flip, index) => (
                <div
                  key={flip.id}
                  className={`rounded-xl border bg-card p-5 transition hover:shadow-lg ${
                    index === 0
                      ? "border-green-500 hover:shadow-green-500/10 md:col-span-2 xl:col-span-3"
                      : "border-border hover:border-green-500/40"
                  }`}
                >
                  {index === 0 && (
                    <div className="mb-3 text-xs text-green-400">🔥 Best ROI</div>
                  )}

                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {flip.skin}
                      </h3>
                    </div>
                    <Badge>{flip.source}</Badge>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {formatCurrency(flip.buyPrice)}
                      </span>
                      <span className="mx-2">→</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(flip.sellPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Profit</div>
                      <div
                        className={`text-2xl font-bold ${
                          flip.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(flip.profit)}
                      </div>
                    </div>
                    <div className="rounded-full bg-green-500/20 px-3 py-2 text-sm font-semibold text-green-400">
                      {formatPercent(flip.roi, 1)}
                    </div>
                  </div>

                  <button className="w-full rounded-lg bg-green-500 py-2 font-semibold text-black hover:bg-green-400 transition">
                    Buy now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
