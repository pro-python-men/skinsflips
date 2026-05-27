import Link from "next/link"
import { useState } from "react"
import { ChevronDown, Gauge, Sparkles, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
  | "confidence"
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

type QualityTone = "good" | "medium" | "slow"

function getFreshnessLabel(timestamp: number | undefined) {
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

function getQualitySignal({
  confidence,
  liquidity,
  salesLast7d,
}: {
  confidence?: number
  liquidity?: Flip["liquidity"]
  salesLast7d?: number
}) {
  const sales = typeof salesLast7d === "number" ? salesLast7d : 0
  const confidenceValue = typeof confidence === "number" ? confidence : null

  if (confidenceValue !== null) {
    if (confidenceValue >= 75) {
      return {
        tone: "good" as QualityTone,
        label: "Fast flip",
        helper: "Strong confidence and likely easier exit",
        value: confidenceValue,
      }
    }
    if (confidenceValue >= 50) {
      return {
        tone: "medium" as QualityTone,
        label: "Balanced flip",
        helper: "Good spread, but worth checking demand first",
        value: confidenceValue,
      }
    }
    return {
      tone: "slow" as QualityTone,
      label: "Slower flip",
      helper: "Profit exists, but demand or certainty is weaker",
      value: confidenceValue,
    }
  }

  if (liquidity === "high" || sales >= 14) {
    return {
      tone: "good" as QualityTone,
      label: "Fast flip",
      helper: "High liquidity suggests a quicker sale window",
      value: 84,
    }
  }
  if (liquidity === "medium" || sales >= 5) {
    return {
      tone: "medium" as QualityTone,
      label: "Balanced flip",
      helper: "Reasonable demand with moderate exit speed",
      value: 58,
    }
  }
  return {
    tone: "slow" as QualityTone,
    label: "Slower flip",
    helper: "Lower liquidity means this may take longer to move",
    value: 32,
  }
}

const toneClassNames: Record<QualityTone, { bar: string; badge: string; glow: string }> = {
  good: {
    bar: "from-emerald-300 via-green-400 to-emerald-500",
    badge: "border-emerald-400/30 bg-emerald-400/12 text-emerald-200",
    glow: "shadow-[0_24px_70px_-42px_rgba(16,185,129,0.6)]",
  },
  medium: {
    bar: "from-amber-200 via-amber-300 to-amber-500",
    badge: "border-amber-300/30 bg-amber-300/12 text-amber-100",
    glow: "shadow-[0_24px_70px_-42px_rgba(245,158,11,0.55)]",
  },
  slow: {
    bar: "from-rose-200 via-rose-400 to-red-500",
    badge: "border-rose-300/30 bg-rose-300/12 text-rose-100",
    glow: "shadow-[0_24px_70px_-42px_rgba(239,68,68,0.55)]",
  },
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
  confidence,
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

  const profitClassName = profit >= 0 ? "text-emerald-300" : "text-rose-300"
  const formattedProfit = `${profit >= 0 ? "+" : "-"}${formatCurrency(Math.abs(profit))}`
  const profitPercentValue = profitPercent ?? (buyPrice > 0 ? (profit / buyPrice) * 100 : 0)
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
  const stabilityValue = Number(stabilityScore ?? 0)
  const stabilityPercent =
    stabilityValue > 0 && stabilityValue <= 1 ? Math.round(stabilityValue * 100) : Math.round(stabilityValue)
  const quality = getQualitySignal({ confidence, liquidity, salesLast7d })
  const toneClasses = toneClassNames[quality.tone]
  const routeText = `Buy on ${sourceBuy} -> Sell on ${sourceSell}`
  const sellWindowText = sellWindow || eta || "Flexible timing"
  const realSignalText =
    signalText ||
    (typeof salesLast7d === "number" && salesLast7d > 0
      ? `${salesLast7d} recent sales backing this spread`
      : "Spread backed by live marketplace pricing")
  const priceFreshnessLabel = `${sourceBuy} price ${getFreshnessLabel(priceLastUpdated)}`
  const salesFreshnessLabel = `Sales data ${getFreshnessLabel(salesDataLastUpdated)}`
  const dataStatusLabel =
    dataStatus === "last_successful_scan"
      ? "Last successful scan"
      : dataStatus === "cached"
        ? "Cached"
        : null
  const isLanding = variant === "landing"
  const isClickable = Boolean(onCardClick)
  const primaryLabel = ctaLabel || "View deal"

  const renderPrimaryAction = () => {
    const href = ctaHref || buyHref
    if (buyDisabled || !href) {
      return (
        <Button
          type="button"
          disabled
          className="h-11 w-full rounded-2xl bg-white text-sm font-semibold text-black opacity-40"
        >
          {primaryLabel}
        </Button>
      )
    }

    return (
      <Button
        asChild
        className="h-11 w-full rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-emerald-200"
      >
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          {primaryLabel}
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
        className="h-11 w-full rounded-2xl border-white/12 bg-white/4 text-sm font-medium text-foreground hover:bg-white/8"
      >
        {isTracked ? "Saved to tracking" : isTracking ? "Saving..." : "Save this flip"}
      </Button>
    )
  }

  const renderMetric = (label: string, value: string, subtle?: string) => (
    <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
      {subtle ? <p className="mt-1 text-xs text-white/45">{subtle}</p> : null}
    </div>
  )

  return (
    <article
      className={[
        "group relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,24,0.98)_0%,rgba(10,12,15,0.98)_100%)] p-5 text-white transition duration-300",
        "hover:-translate-y-1 hover:border-white/18",
        toneClasses.glow,
        featured || isBest ? "ring-1 ring-white/10" : "",
        isLanding ? "min-h-[540px]" : "",
        isClickable ? "cursor-pointer" : "",
      ].join(" ")}
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_34%)] opacity-80" />
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {(featured || isBest) && (
            <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/78">
              Priority pick
            </span>
          )}
          <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${toneClasses.badge}`}>
            {quality.label}
          </span>
          {dataStatusLabel ? (
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-100">
              {dataStatusLabel}
            </span>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <p className="max-w-[24ch] text-[clamp(1.2rem,2vw,1.7rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
              {name}
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200/80">
              {routeText}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/18 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Estimated profit</p>
                <div className={`mt-2 text-4xl font-semibold leading-none tracking-[-0.05em] ${profitClassName}`}>
                  {formattedProfit}
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">ROI</p>
                <p className="mt-1 text-lg font-semibold text-white">{formatPercent(profitPercentValue, 0)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-white/62">{realSignalText}</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-white/70" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Flip signal</p>
                <p className="text-sm font-medium text-white">{quality.helper}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Score</p>
              <p className="text-base font-semibold text-white">{quality.value}/100</p>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/8">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${toneClasses.bar}`}
              style={{ width: `${quality.value}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/46">
            <span>{liquidity ? `Liquidity ${liquidity}` : "Liquidity unknown"}</span>
            <span>•</span>
            <span>{sellWindowText}</span>
            {typeof confidence === "number" ? (
              <>
                <span>•</span>
                <span>Confidence {confidence}%</span>
              </>
            ) : null}
          </div>
        </div>

        <div className={`grid gap-3 ${isLanding ? "sm:grid-cols-2" : "grid-cols-2"}`}>
          {renderMetric("Buy", formatCurrency(buyPrice), sourceBuy)}
          {renderMetric("Sell", formatCurrency(sellPrice), sourceSell)}
          {renderMetric("Net after fees", formatCurrency(netSellValue), `Fee ${formattedFeeRate}`)}
          {renderMetric("Exit speed", eta || "Not specified", typeof salesLast7d === "number" ? `${salesLast7d} sales / 7d` : undefined)}
        </div>

        <div className="space-y-2">
          {renderPrimaryAction()}
          {renderSecondaryAction()}
          {isTracked ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/18 bg-emerald-400/8 px-4 py-3 text-xs font-medium text-emerald-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Saved to your tracking list</span>
              </div>
              <Link href={trackedHref} className="underline underline-offset-4">
                Open tracking
              </Link>
            </div>
          ) : null}
        </div>

        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-between rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white/64 hover:bg-white/7 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Market details
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isDetailsOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {renderMetric("Marketplace fee", formatCurrency(feeAmount), formattedFeeRate)}
              {renderMetric("Rank score", rankScore != null ? String(rankScore) : "-", stabilityPercent > 0 ? `Stability ${stabilityPercent}%` : undefined)}
              {renderMetric("Price freshness", priceFreshnessLabel)}
              {renderMetric("Sales freshness", salesFreshnessLabel, typeof salesLast30d === "number" ? `${salesLast30d} sales / 30d` : undefined)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </article>
  )
}
