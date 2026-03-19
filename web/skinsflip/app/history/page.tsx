"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api"
import { DashboardLayout } from "@/components/dashboard-layout"
import { FlipsTable, Flip } from "@/components/flips-table"
import { HistoryFilters } from "@/components/history-filters"
import { EmptyState } from "@/components/empty-state"
import { History } from "lucide-react"

export default function HistoryPage() {
  const [dateRange, setDateRange] = useState("All Time")
  const [weapon, setWeapon] = useState("All Weapons")
  const [profitFilter, setProfitFilter] = useState("All")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [flips, setFlips] = useState<Flip[]>([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError("")

      try {
        const data = await apiFetch("/api/flips")

      if (!data) {
        setFlips([])
        return
      }

      setFlips(Array.isArray(data) ? (data as Flip[]) : [])
      } catch (e: any) {
        setError(e?.message || "Failed to load history")
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const filteredFlips = useMemo(() => {
    return flips.filter((flip) => {
      if (weapon !== "All Weapons") {
        const skinWeapon = flip.skin.split(" | ")[0]
        if (skinWeapon !== weapon) return false
      }

      if (profitFilter === "Profitable Only" && flip.profit < 0) return false
      if (profitFilter === "Losses Only" && flip.profit >= 0) return false

      return true
    })
  }, [flips, weapon, profitFilter])

  return (
    <DashboardLayout title="Flip History">
      <div className="space-y-6">
        <HistoryFilters
          dateRange={dateRange}
          weapon={weapon}
          profitFilter={profitFilter}
          onDateRangeChange={setDateRange}
          onWeaponChange={setWeapon}
          onProfitFilterChange={setProfitFilter}
        />

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Loading flips…
          </div>
        ) : null}

        {!loading && flips.length === 0 ? (
          <EmptyState
            icon={History}
            title="No flips available"
            description="Login to see your flip history."
          />
        ) : null}

        {!loading && flips.length > 0 && filteredFlips.length === 0 ? (
          <EmptyState
            icon={History}
            title="No flips match your filters"
            description="Try adjusting your filters to see more results."
          />
        ) : !loading && filteredFlips.length > 0 ? (
          <FlipsTable flips={filteredFlips} />
        ) : null}
      </div>
    </DashboardLayout>
  )
}