"use client"

import Image from "next/image"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { ProfitChart } from "@/components/profit-chart"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import { ROIChart } from "@/components/roi-chart"
import { FlipsTable, Flip } from "@/components/flips-table"
import { DollarSign, TrendingUp, RefreshCcw, Package } from "lucide-react"
import { AddFlipForm } from "@/components/add-flip-form"
import { formatCurrency, formatPercent } from "@/lib/format"

type AuthUser = {
  id?: number
  email?: string | null
  steamId?: string | null
  displayName?: string | null
  avatarUrl?: string | null
}

type HeroSectionProps = {
  onFindBestFlips: () => void
}

function HeroSection({ onFindBestFlips }: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      <Image
        src="/banner.png"
        alt="Find profitable CS2 skin deals in seconds"
        width={1920}
        height={500}
        className="h-[260px] w-full object-cover sm:h-[320px]"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/35">
        <div className="flex h-full items-center p-6 sm:p-8">
          <div className="max-w-2xl space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Find profitable CS2 skin deals in seconds
            </h1>
            <p className="max-w-xl text-sm text-white/80 sm:text-base">
              Enter your budget and discover skins you can flip for profit based on real market data
            </p>
            <button
              type="button"
              onClick={onFindBestFlips}
              className="rounded-lg bg-emerald-400 px-5 py-2.5 font-semibold text-black transition-colors hover:bg-emerald-300"
            >
              Find Best Flips
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HowItWorksSection() {
  const steps = [
    "Enter budget",
    "Find underpriced skins",
    "Sell for profit",
  ]

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">How it works</h2>
        <p className="text-sm text-muted-foreground">Opportunities change quickly</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step} className="rounded-lg border border-border/60 bg-background/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Step {index + 1}
            </p>
            <p className="mt-2 text-base font-medium text-foreground">{step}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function BestFlipsEntrySection() {
  return (
    <section id="best-flips-entry" className="scroll-mt-24 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            Best Flips
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            See best opportunities
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Go straight to the latest flip opportunities and start scanning real deals.
          </p>
        </div>

        <Button asChild className="w-full sm:w-auto">
          <Link href="/best-flips">See opportunity</Link>
        </Button>
      </div>
    </section>
  )
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
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

  const scrollToBestFlips = () => {
    const target = document.getElementById("best-flips-entry")

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }

    window.location.href = "/best-flips"
  }

  const refreshAuth = async () => {
    setAuthLoading(true)

    try {
      const data = await apiFetch("/api/auth/me")
      setUser((data as { user?: AuthUser | null } | null)?.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setAuthLoading(false)
    }
  }

  const refresh = async () => {
    setLoading(true)
    setError("")

    try {
      const [statsData, flipsData] = await Promise.all([
        apiFetch("/api/stats"),
        apiFetch("/api/flips"),
      ])

      if (statsData === null && flipsData === null) {
        // No data with authorization - showing empty dashboard.
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
      // if apiFetch returns null, it was already handled; for other errors display info
      setError(e?.message || "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAuth()
  }, [])

  useEffect(() => {
    if (authLoading || user === null) {
      setLoading(false)
      return
    }

    refresh()
  }, [authLoading, user])

  if (authLoading || (user !== null && loading)) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6 text-muted-foreground">Loading dashboard...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {user === null ? (
          <>
            <HeroSection onFindBestFlips={scrollToBestFlips} />
            <HowItWorksSection />
            <BestFlipsEntrySection />
          </>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Welcome back
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {user.displayName ?? user.email ?? "Steam user"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Monitor your flip performance and spot where your profit is growing.
                  </p>
                </div>

                <div className="text-sm text-muted-foreground">
                  {user.steamId ? `Steam ID: ${user.steamId}` : "Connected with Steam"}
                </div>
              </div>
            </div>

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

            <section id="add-flip-form" className="scroll-mt-24">
              <AddFlipForm onCreated={refresh} />
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Best Flip" value={bestFlip ? formatCurrency(bestFlip.profit) : "$0"} description={bestFlip ? bestFlip.skin : "No flips yet"} icon={TrendingUp} trend="up" />
              <StatCard title="Worst Flip" value={worstFlip ? formatCurrency(worstFlip.profit) : "$0"} description={worstFlip ? worstFlip.skin : "No flips yet"} icon={TrendingUp} trend="down" />
              <StatCard title="Average Profit" value={formatCurrency(avgProfit)} description="Per flip" icon={DollarSign} trend={avgProfit >= 0 ? "up" : "down"} />
              <StatCard title="Average ROI" value={formatPercent(avgROI, 1)} description="Across flips" icon={TrendingUp} trend={avgROI >= 0 ? "up" : "down"} />
            </div>

            {stats.totalFlips === 0 ? (
              <div className="py-10 text-center">
                <p className="text-lg font-semibold">
                  You don’t have any flips yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start by finding your first profitable deal
                </p>

                <button
                  onClick={scrollToBestFlips}
                  className="mt-4 rounded-md bg-emerald-500 px-4 py-2 font-medium text-black"
                >
                  Find Best Flips
                </button>
              </div>
            ) : null}

            <ROIChart data={roiData} />
            <ProfitChart flips={filteredFlips} />
            <FlipsTable flips={filteredFlips} />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
