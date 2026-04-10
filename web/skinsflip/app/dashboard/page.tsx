"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DealCard } from "@/components/deal-card"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import type { Flip } from "@/lib/types/flip"

function formatUpdatedSeconds(lastUpdatedAt: number | null) {
  if (lastUpdatedAt === null) {
    return "Updated just now"
  }

  const seconds = Math.max(0, Math.floor((Date.now() - lastUpdatedAt) / 1000))
  const label = seconds === 1 ? "second" : "seconds"
  return `Updated ${seconds} ${label} ago`
}

export default function DashboardPage() {
  const updateIntervalMs = 15000
  const [flips, setFlips] = useState<Flip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [updatedLabel, setUpdatedLabel] = useState("Updated just now")

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

  const loadFlips = async () => {
    setLoading(true)
    setError("")

    try {
      const flipsData = await apiFetch("/api/flips/best")
      const safeFlips = Array.isArray(flipsData) ? (flipsData as Flip[]) : []
      setFlips(safeFlips)
      setLastUpdatedAt(Date.now())
    } catch (e: any) {
      setError(e?.message || "Failed to load best opportunities")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFlips()
  }, [])

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
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Best opportunities right now
            </h1>
            <p className="text-sm text-muted-foreground">
              Start with the highest-profit, fastest-selling flips first.
            </p>
            <p className="text-sm text-muted-foreground">{updatedLabel}</p>
          </div>

          <Button type="button" variant="secondary" onClick={loadFlips}>
            Refresh list
          </Button>
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
                    <DealCard key={flip.id} {...flip} />
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
