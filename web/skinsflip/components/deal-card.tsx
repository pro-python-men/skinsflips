import Link from "next/link"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { formatCurrency, formatPercent } from "@/lib/format"
import type { Flip } from "@/lib/types/flip"

type DealCardProps = Pick<
  Flip,
  | "name"
  | "buyPrice"
  | "sellPrice"
  | "marketplaceFee"
  | "marketplaceFeeRate"
  | "netSell"
  | "profit"
  | "profitPercent"
  | "sourceBuy"
  | "sourceSell"
  | "liquidity"
  | "eta"
  | "rankScore"
  | "priceLastUpdated"
  | "salesDataLastUpdated"
  | "dataStatus"
> & {
  sellWindow?: Flip["sellWindow"]
  salesLast7d?: Flip["salesLast7d"]
  salesLast30d?: Flip["salesLast30d"]
  stabilityScore?: Flip["stabilityScore"]
  buyHref?: string
  buyDisabled?: boolean
  onTrack?: () => void
  isTracking?: boolean
  isTracked?: boolean
  trackedHref?: string
  featured?: boolean
  isBest?: boolean
  variant?: "default" | "landing"
  signalText?: string
  ctaLabel?: string
  ctaHref?: string
  onCardClick?: () => void
}

export function DealCard({
  name,
  buyPrice,
  sellPrice,
  marketplaceFee,
  marketplaceFeeRate,
  netSell,
  profit,
  profitPercent,
  sourceBuy,
  sourceSell,
  liquidity,
  eta,
  rankScore,
  priceLastUpdated,
  salesDataLastUpdated,
  dataStatus,
  sellWindow,
  salesLast7d,
  salesLast30d,
  stabilityScore,
  buyHref,
  buyDisabled = false,
  onTrack,
  isTracking = false,
  isTracked = false,
  trackedHref = "/history",
  featured = false,
  isBest = false,
  variant = "default",
  signalText,
  ctaLabel,
  ctaHref,
  onCardClick,
}: DealCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const getLiquiditySimple = (): { label: string; duration?: string } => {
    const salesCount = typeof salesLast7d === "number" ? salesLast7d : 0
    if (salesCount >= 20) return { label: "Fast", duration: eta }
    if (salesCount >= 10) return { label: "Medium", duration: eta }
    if (salesCount >= 3) return { label: "Medium", duration: eta }
    return { label: "Slow", duration: eta }
  }

  const liquiditySimple = getLiquiditySimple()

  const formatEtaText = (value: string | undefined) => {
    if (!value) return "within a few days"
    return String(value).replace(/^~/, "about ")
  }

  const getWhyThisFlipText = () => {
    if (signalText) return signalText
    if (salesCount >= 10) return "High demand + recent sales"
    if (profitPercent && profitPercent >= 10) return "Price gap between marketplaces"
    if (stabilityPercent >= 70) return "Undervalued listing detected"
    return "Profitable spread backed by recent sales"
  }

  const getUrgencyText = () => {
    if (salesCount >= 20) return "🔥 Opportunity active now"
    if (salesCount >= 10) return "Selling fast"
    return "High demand"
  }

  const getLiquidityDecisionText = () => {
    if (salesCount >= 20) return "Sells fast"
    if (salesCount >= 10) return "Moves quickly"
    if (salesCount >= 3) return `Steady demand (${formatEtaText(eta)})`
    return `Slower sale (${formatEtaText(eta)})`
  }

  const getRealMarketText = () => {
    if (salesCount > 0) return "Based on last 7 days sales"
    return "Recent real sales data"
  }

  const getScarcityText = () => {
    if (featured || isBest) return "Top opportunity right now"
    return "Only a few deals like this available"
  }

  const formatFreshnessAge = (timestamp: number | undefined) => {
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return "unknown"

    const ageMs = Math.max(0, Date.now() - timestamp)
    const minutes = Math.floor(ageMs / 60_000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes} min ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hr ago`

    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? "" : "s"} ago`
  }

  const profitClassName = profit >= 0 ? "text-emerald-400" : "text-red-400"
  const formattedProfit = `${profit >= 0 ? "+" : "-"}${formatCurrency(Math.abs(profit))}`
  const profitPercentValue = profitPercent ?? (buyPrice > 0 ? (profit / buyPrice) * 100 : 0)
  const formattedProfitPercent = `${formatPercent(profitPercentValue, 0)}`
  const feeAmount =
    typeof marketplaceFee === "number" && Number.isFinite(marketplaceFee)
      ? marketplaceFee
      : typeof netSell === "number" && Number.isFinite(netSell)
        ? Math.max(0, sellPrice - netSell)
        : 0
  const netSellValue =
    typeof netSell === "number" && Number.isFinite(netSell) ? netSell : sellPrice - feeAmount
  const feeRatePercent =
    typeof marketplaceFeeRate === "number" && Number.isFinite(marketplaceFeeRate)
      ? marketplaceFeeRate * 100
      : sellPrice > 0
        ? (feeAmount / sellPrice) * 100
        : 0
  const formattedFeeRate = formatPercent(feeRatePercent, feeRatePercent % 1 === 0 ? 0 : 1)
  const salesCount = typeof salesLast7d === "number" ? salesLast7d : 0
  const stabilityValue = Number(stabilityScore ?? 0)
  const stabilityPercent =
    stabilityValue > 0 && stabilityValue <= 1 ? Math.round(stabilityValue * 100) : Math.round(stabilityValue)
  const sellWindowText = sellWindow ? sellWindow : "n/a"
  const liquidityText = liquidity ? liquidity : "unknown"
  const liquidityLabel = liquidity ? liquidity[0].toUpperCase() + liquidity.slice(1) : "Unknown"
  const salesLast7dLabel =
    typeof salesLast7d === "number" && Number.isFinite(salesLast7d)
      ? `${salesLast7d} sales (7d)`
      : "No 7d sales data"
  const salesLast30dLabel =
    typeof salesLast30d === "number" && Number.isFinite(salesLast30d)
      ? `${salesLast30d} sales (30d)`
      : "No 30d sales data"
  const priceStabilityLabel =
    typeof stabilityScore === "number" && Number.isFinite(stabilityScore)
      ? stabilityPercent >= 70
        ? "High"
        : stabilityPercent >= 40
          ? "Medium"
          : "Low"
      : null
  const etaDisplay = eta ?? "~7 days"
  const priceFreshnessLabel = `${sourceBuy} price: ${formatFreshnessAge(priceLastUpdated)}`
  const salesFreshnessLabel = `Sales data: ${formatFreshnessAge(salesDataLastUpdated)}`
  const dataStatusLabel =
    dataStatus === "last_successful_scan"
      ? "Last successful scan"
      : dataStatus === "cached"
        ? "Cached data"
        : null
  const routeText = `Buy on ${sourceBuy} -> Sell on ${sourceSell}`
  const whyThisFlipText = getWhyThisFlipText()
  const urgencyText = getUrgencyText()
  const liquidityDecisionText = getLiquidityDecisionText()
  const realMarketText = getRealMarketText()
  const scarcityText = getScarcityText()
  const metaText = [
    `Rank ${rankScore ?? "-"}`,
    `Liquidity ${liquidityText}`,
    `Sell window ${sellWindowText}`,
  ].join(" • ")
  const isLanding = variant === "landing"
  const isClickable = Boolean(onCardClick)
  const containerClassName = [
    "rounded-xl border border-border bg-zinc-950 p-6 shadow-sm transition-transform transition-colors duration-200 hover:-translate-y-1 hover:border-emerald-400/40",
    isClickable ? "cursor-pointer" : "",
  ].join(" ")

  const renderPrimaryAction = () => {
    if (buyDisabled || !buyHref) {
      return (
        <Button
          type="button"
          disabled
          className="h-11 w-full rounded-xl bg-emerald-500 text-base font-semibold text-black opacity-45"
        >
          View deal
        </Button>
      )
    }

    return (
      <Button
        asChild
        className="h-11 w-full rounded-xl bg-green-500 text-base font-semibold text-black shadow-[0_16px_40px_rgba(34,197,94,0.24)] transition hover:bg-green-600"
      >
        <a
          href={buyHref}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          View deal
        </a>
      </Button>
    )
  }

  const renderSecondaryAction = () => {
    if (!onTrack) return null

    return (
      <Button
        type="button"
        variant="outline"
        onClick={(event) => {
          event.stopPropagation()
          onTrack()
        }}
        disabled={isTracking || isTracked}
        className="h-10 w-full rounded-xl border-border/80 bg-transparent text-sm font-medium text-foreground hover:bg-background/50"
      >
        {isTracked ? "Saved" : isTracking ? "Saving..." : "Save"}
      </Button>
    )
  }

  const renderEvidence = () => (
    <div className="rounded-xl border border-border/60 bg-background/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Evidence</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-border/50 bg-background/20 px-3 py-2 text-foreground">
          {salesLast7dLabel}
        </div>
        <div className="rounded-lg border border-border/50 bg-background/20 px-3 py-2 text-foreground">
          {salesLast30dLabel}
        </div>
        <div className="rounded-lg border border-border/50 bg-background/20 px-3 py-2 text-muted-foreground">
          Liquidity: <span className="font-medium text-foreground">{liquidityLabel}</span>
        </div>
        {priceStabilityLabel ? (
          <div className="rounded-lg border border-border/50 bg-background/20 px-3 py-2 text-muted-foreground">
            Price stability: <span className="font-medium text-foreground">{priceStabilityLabel}</span>
          </div>
        ) : null}
      </div>
      <div className="mt-3 space-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{priceFreshnessLabel}</span>
          {dataStatusLabel ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-medium text-amber-200">
              {dataStatusLabel}
            </span>
          ) : null}
        </div>
        <div>{salesFreshnessLabel}</div>
      </div>
    </div>
  )

  const renderProfitBreakdown = (compact = false) => (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">Profit breakdown</p>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Buy on {sourceBuy}</span>
          <span className="font-semibold text-foreground">{formatCurrency(buyPrice)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Sell on {sourceSell}</span>
          <span className="font-semibold text-foreground">{formatCurrency(sellPrice)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Fee ({formattedFeeRate})</span>
          <span className="font-semibold text-rose-300">-{formatCurrency(feeAmount)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2">
          <span className="text-muted-foreground">Net</span>
          <span className="font-semibold text-foreground">{formatCurrency(netSellValue)}</span>
        </div>
        <div className="flex items-end justify-between gap-4 border-t border-emerald-500/20 pt-3">
          <span className="text-muted-foreground">Profit</span>
          <span className={`text-right font-extrabold leading-none ${profitClassName} ${compact ? "text-2xl" : "text-3xl"}`}>
            {formattedProfit} <span className="text-lg font-bold text-emerald-300">{formattedProfitPercent}</span>
          </span>
        </div>
      </div>
    </div>
  )

  if (isLanding) {
    return (
      <div
        className={containerClassName}
        onClick={onCardClick}
        onKeyDown={(event) => {
          if (!onCardClick) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onCardClick()
          }
        }}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >
        <div className="space-y-5">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-white">{name}</p>
            <p className="text-xs font-medium text-emerald-300">{routeText}</p>
            <p className="text-sm text-muted-foreground">
              Buy {formatCurrency(buyPrice)} {"\u2192"} Sell {formatCurrency(sellPrice)}
            </p>
          </div>

          <div className="space-y-2">
            {renderProfitBreakdown(true)}
            <p className="text-sm font-medium text-emerald-200">Based on median sell price after marketplace fee.</p>
            <p className="text-sm text-muted-foreground">{whyThisFlipText}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300">
                {urgencyText}
              </span>
              <span className="text-muted-foreground">{realMarketText}</span>
            </div>
            <p className="text-xs text-muted-foreground">{scarcityText}</p>
          </div>

          <div className="space-y-2">
            {renderPrimaryAction()}
            <p className="text-xs text-muted-foreground">{realMarketText}</p>
            {renderSecondaryAction()}
            {isTracked ? (
              <div className="flex items-center justify-between gap-3 text-xs font-medium text-emerald-300">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Now saving potential profit</span>
                </div>
                <Link href={trackedHref} className="text-emerald-200 underline underline-offset-4">
                  View tracking
                </Link>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Buy on {sourceBuy}</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(buyPrice)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sell on {sourceSell}</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(sellPrice)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Liquidity</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{liquidityDecisionText}</p>
              <p className="mt-1 text-sm text-muted-foreground">{realMarketText}</p>
            </div>
            {renderEvidence()}
          </div>

          <p className="text-xs text-muted-foreground">{metaText}</p>
        </div>
      </div>
    )
  }

  // Decision-first minimal view
  return (
    <div
      className={containerClassName}
      onClick={onCardClick}
      onKeyDown={(event) => {
        if (!onCardClick) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onCardClick()
        }
      }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="space-y-5">
        {/* Header with name and price flow */}
        <div className="space-y-2">
          <p className="text-lg font-semibold text-white">{name}</p>
          <p className="text-xs font-medium text-emerald-300">{routeText}</p>
          <p className="text-xs text-muted-foreground">
            Buy {formatCurrency(buyPrice)} {"\u2192"} Est. sell {formatCurrency(sellPrice)}
          </p>
        </div>

        {/* Profit - Main focal point */}
        <div className="space-y-1">
          <div className={`text-4xl font-extrabold leading-tight ${profitClassName}`}>
            {formattedProfit}
          </div>
          <p className="text-sm font-semibold text-emerald-300">{formattedProfitPercent}</p>
        </div>

        {/* Liquidity */}
        <div className="flex items-center gap-2">
          <span className="inline-block rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground">
            {liquiditySimple.label}
          </span>
          {liquiditySimple.duration ? (
            <span className="text-xs text-muted-foreground">{liquiditySimple.duration}</span>
          ) : null}
        </div>

        {/* Tracking confirmation state */}
        {isTracked ? (
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Saved</span>
          </div>
        ) : null}

        {/* CTA Buttons */}
        <div className="space-y-2">
          {renderPrimaryAction()}
          {renderSecondaryAction()}
        </div>

        {/* Collapsible Details Section */}
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-start p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isDetailsOpen ? "rotate-180" : ""}`} />
              <span className="ml-1">Show details</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-3 pt-3 border-t border-border/60">
            {renderProfitBreakdown(true)}
            {renderEvidence()}
            <div className="text-xs text-muted-foreground pt-2">{metaText}</div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
