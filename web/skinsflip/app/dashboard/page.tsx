"use client"
import { ProfitChart } from "@/components/profit-chart"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { StatCard } from "@/components/stat-card"
import { ROIChart } from "@/components/roi-chart"
import { FlipsTable, Flip } from "@/components/flips-table"
import { DollarSign, TrendingUp, RefreshCcw, Package } from "lucide-react"
import { AddFlipForm } from "@/components/add-flip-form"
import { formatCurrency, formatPercent } from "@/lib/format"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  // Stan dla statystyk
  const [stats, setStats] = useState({
    totalProfit: 0,
    averageROI: 0,
    totalFlips: 0,
    inventoryValue: 0,
  })

  // Stan dla ROIChart
  const [roiData, setRoiData] = useState<{ date: string; roi: number }[]>([])

  // Stan dla tabeli flipów
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

  const refresh = async () => {
    setLoading(true)
    setError("")

    try {
      const [statsRes, flipsRes] = await Promise.all([fetch("/api/stats"), fetch("/api/flips")])

      if (statsRes.status === 401 || flipsRes.status === 401) {
        router.replace("/login")
        return
      }

      const statsData = await statsRes.json().catch(() => null)
      const flipsData = await flipsRes.json().catch(() => [])

      if (!statsRes.ok) throw new Error(statsData?.message || "Failed to fetch stats")
      if (!flipsRes.ok) throw new Error((flipsData as any)?.message || "Failed to fetch flips")

      setStats({
        totalProfit: Number(statsData?.totalProfit ?? 0),
        averageROI: Number(statsData?.averageROI ?? 0),
        totalFlips: Number(statsData?.totalFlips ?? 0),
        inventoryValue: Number(statsData?.inventoryValue ?? 0),
      })

      const safeFlips = Array.isArray(flipsData) ? (flipsData as Flip[]) : []
      setFlips(safeFlips)

      const roiPoints = safeFlips
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((f) => ({ date: f.date, roi: f.roi }))

      setRoiData(roiPoints)
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

    // Pobranie flipów
    /* replaced by refresh() */

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        <div className="flex gap-2">
  <button
    onClick={() => setTimeFilter("7d")}
    className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm"
  >
    7D
  </button>

  <button
    onClick={() => setTimeFilter("30d")}
    className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm"
  >
    30D
  </button>

  <button
    onClick={() => setTimeFilter("all")}
    className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm"
  >
    ALL
  </button>
</div>
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Profit"
            value={formatCurrency(stats.totalProfit)}
            description="All time earnings"
            icon={DollarSign}
            trend={stats.totalProfit >= 0 ? "up" : "down"}
          />
          <StatCard
            title="Average ROI"
            value={formatPercent(stats.averageROI, 1)}
            description="Per flip average"
            icon={TrendingUp}
            trend={stats.averageROI >= 0 ? "up" : "down"}
          />
          <StatCard
            title="Total Flips"
            value={stats.totalFlips.toString()}
            description="Completed trades"
            icon={RefreshCcw}
            trend="neutral"
          />
          <StatCard
            title="Inventory Value"
            value={formatCurrency(stats.inventoryValue)}
            description="Current holdings"
            icon={Package}
            trend="neutral"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Loading dashboard…
          </div>
        ) : null}

        <AddFlipForm onCreated={refresh} />

        {/* ROI Chart */}
        <ROIChart data={roiData} />

        {/* Profit Chart */}
        <ProfitChart flips={filteredFlips} /> 

        <FlipsTable flips={filteredFlips} />
      </div>
    </DashboardLayout>
  )
}
