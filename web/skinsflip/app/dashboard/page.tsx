"use client"

import { apiFetch } from "@/lib/api"
import { ProfitChart } from "@/components/profit-chart"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { StatCard } from "@/components/stat-card"
import { ROIChart } from "@/components/roi-chart"
import { FlipsTable, Flip } from "@/components/flips-table"
import { DollarSign, TrendingUp, RefreshCcw, Package } from "lucide-react"
import { AddFlipForm } from "@/components/add-flip-form"
import { formatCurrency, formatPercent } from "@/lib/format"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalProfit: 0,
    averageROI: 0,
    totalFlips: 0,
    inventoryValue: 0,
  })

  const [roiData, setRoiData] = useState<{ date: string; roi: number }[]>([])
  const [flips, setFlips] = useState<Flip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [timeFilter, setTimeFilter] = useState<"7d" | "30d" | "all">("all")

  const filteredFlips = flips.filter((flip) => {
    if (timeFilter === "all") return true

    const flipDate = new Date(flip.date)
    const now = new Date()
    const days = timeFilter === "7d" ? 7 : 30

    const diffTime = now.getTime() - flipDate.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)

    return diffDays <= days
  })

  const bestFlip =
    filteredFlips.length > 0
      ? filteredFlips.reduce((max, f) => (f.profit > max.profit ? f : max), filteredFlips[0])
      : null

  const worstFlip =
    filteredFlips.length > 0
      ? filteredFlips.reduce((min, f) => (f.profit < min.profit ? f : min), filteredFlips[0])
      : null

  const avgProfit =
    filteredFlips.length > 0
      ? filteredFlips.reduce((sum, f) => sum + f.profit, 0) / filteredFlips.length
      : 0

  const avgROI =
    filteredFlips.length > 0
      ? filteredFlips.reduce((sum, f) => sum + f.roi, 0) / filteredFlips.length
      : 0

  const refresh = async () => {
    setLoading(true)
    setError("")

    try {
      const [statsData, flipsData] = await Promise.all([
        apiFetch("/api/stats"),
        apiFetch("/api/flips"),
      ])

      if (statsData === null && flipsData === null) {
        // Brak danych z autoryzacją - pokazujemy pusty dashboard.
        setStats({ totalProfit: 0, averageROI: 0, totalFlips: 0, inventoryValue: 0 })
        setFlips([])
        setRoiData([])
        return
      }

      setStats({
        totalProfit: Number(statsData?.totalProfit ?? 0),
        averageROI: Number(statsData?.averageROI ?? 0),
        totalFlips: Number(statsData?.totalFlips ?? 0),
        inventoryValue: Number(statsData?.inventoryValue ?? 0),
      })

      const safeFlips = Array.isArray(flipsData) ? flipsData : []
      setFlips(safeFlips)

      const roiPoints = safeFlips
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((f) => ({ date: f.date, roi: f.roi }))

      setRoiData(roiPoints)
    } catch (e: any) {
      // jeśli apiFetch zwróci null, już było obsłużone; dla innych błędów wyświetlamy info
      setError(e?.message || "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6 text-muted-foreground">Loading dashboard...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">

        <div className="flex gap-2">
          <button onClick={() => setTimeFilter("7d")} className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm">
            7D
          </button>
          <button onClick={() => setTimeFilter("30d")} className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm">
            30D
          </button>
          <button onClick={() => setTimeFilter("all")} className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm">
            ALL
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Profit" value={formatCurrency(stats.totalProfit)} description="All time earnings" icon={DollarSign} trend={stats.totalProfit >= 0 ? "up" : "down"} />
          <StatCard title="Average ROI" value={formatPercent(stats.averageROI, 1)} description="Per flip average" icon={TrendingUp} trend={stats.averageROI >= 0 ? "up" : "down"} />
          <StatCard title="Total Flips" value={stats.totalFlips.toString()} description="Completed trades" icon={RefreshCcw} trend="neutral" />
          <StatCard title="Inventory Value" value={formatCurrency(stats.inventoryValue)} description="Current holdings" icon={Package} trend="neutral" />
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <AddFlipForm onCreated={refresh} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Best Flip" value={bestFlip ? formatCurrency(bestFlip.profit) : "$0"} description={bestFlip ? bestFlip.skin : "No flips yet"} icon={TrendingUp} trend="up" />
          <StatCard title="Worst Flip" value={worstFlip ? formatCurrency(worstFlip.profit) : "$0"} description={worstFlip ? worstFlip.skin : "No flips yet"} icon={TrendingUp} trend="down" />
          <StatCard title="Average Profit" value={formatCurrency(avgProfit)} description="Per flip" icon={DollarSign} trend={avgProfit >= 0 ? "up" : "down"} />
          <StatCard title="Average ROI" value={formatPercent(avgROI, 1)} description="Across flips" icon={TrendingUp} trend={avgROI >= 0 ? "up" : "down"} />
        </div>

        <ROIChart data={roiData} />
        <ProfitChart flips={filteredFlips} />
        <FlipsTable flips={filteredFlips} />

      </div>
    </DashboardLayout>
  )
}