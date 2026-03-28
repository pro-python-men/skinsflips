"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api"
import { DashboardLayout } from "@/components/dashboard-layout"
import { FlipsTable, Flip } from "@/components/flips-table"
import { HistoryFilters } from "@/components/history-filters"
import { EmptyState } from "@/components/empty-state"
import { StatCard } from "@/components/stat-card"
import { formatCurrency, formatPercent } from "@/lib/format"
import { DollarSign, History, RefreshCcw, TrendingUp } from "lucide-react"

export default function HistoryPage() {
  const [dateRange, setDateRange] = useState("All Time")
  const [weapon, setWeapon] = useState("All Weapons")
  const [profitFilter, setProfitFilter] = useState("All")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [flips, setFlips] = useState<Flip[]>([])
  const [stats, setStats] = useState({
    totalProfit: 0,
    averageROI: 0,
    totalFlips: 0,
  })

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError("")

      try {
        const [statsData, flipsData] = await Promise.all([
          apiFetch("/api/stats"),
          apiFetch("/api/flips"),
        ])

        if (statsData === null && flipsData === null) {
          setStats({ totalProfit: 0, averageROI: 0, totalFlips: 0 })
          setFlips([])
          return
        }

        setStats({
          totalProfit: Number((statsData as any)?.totalProfit ?? 0),
          averageROI: Number((statsData as any)?.averageROI ?? 0),
          totalFlips: Number((statsData as any)?.totalFlips ?? 0),
        })

        setFlips(Array.isArray(flipsData) ? (flipsData as Flip[]) : [])
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
    <DashboardLayout title="Flip History" requireAuth>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Profit"
            value={formatCurrency(stats.totalProfit)}
            description="All time"
            icon={DollarSign}
            trend={stats.totalProfit >= 0 ? "up" : "down"}
          />
          <StatCard
            title="Average ROI"
            value={formatPercent(stats.averageROI, 1)}
            description="All time"
            icon={TrendingUp}
            trend={stats.averageROI >= 0 ? "up" : "down"}
          />
          <StatCard
            title="Total Flips"
            value={stats.totalFlips.toString()}
            description="All time"
            icon={RefreshCcw}
            trend="neutral"
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
