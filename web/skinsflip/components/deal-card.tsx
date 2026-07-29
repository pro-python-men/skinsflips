import Link from "next/link"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { LocalSkinImage } from "@/components/local-skin-image"
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
        label: "Good flip",
        helper: "High confidence and easier exit",
        value: confidenceValue,
      }
    }
    if (confidenceValue >= 50) {
      return {
        tone: "medium" as QualityTone,
        label: "Average flip",
        helper: "Decent spread, but check demand",
        value: confidenceValue,
      }
    }
    return {
      tone: "slow" as QualityTone,
      label: "Slow flip",
      helper: "Lower confidence or weaker exit quality",
      value: confidenceValue,
    }
  }

  if (liquidity === "high" || sales >= 14) {
    return {
      tone: "good" as QualityTone,
      label: "Good flip",
      helper: "High liquidity suggests a faster sale",
      value: 84,
    }
  }
  if (liquidity === "medium" || sales >= 5) {
    return {
      tone: "medium" as QualityTone,
      label: "Average flip",
      helper: "Moderate demand and exit speed",
      value: 58,
    }
  }
  return {
    tone: "slow" as QualityTone,
    label: "Slow flip",
    helper: "Lower liquidity means slower exit",
    value: 32,
  }
}

const toneClassNames: Record<QualityTone, { badge: string }> = {
  good: {
    badge: "border-[#d5a65a]/30 bg-[#d5a65a]/12 text-[#f8e7bf]",
  },
  medium: {
    badge: "border-amber-300/30 bg-amber-300/12 text-amber-100",
  },
  slow: {
    badge: "border-rose-300/30 bg-rose-300/12 text-rose-100",
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

  const profitClassName = profit >= 0 ? "text-[#f1c87a]" : "text-rose-300"
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
        className="h-11 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
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
    <div className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
      {subtle ? <p className="mt-1 text-xs text-white/42">{subtle}</p> : null}
    </div>
  )

  return (
    <article
      className={[
        "group relative self-start overflow-hidden rounded-[24px] border border-white/10 bg-card p-4 text-white transition duration-300",
        "hover:-translate-y-1 hover:border-white/18",
        featured || isBest ? "ring-1 ring-white/10" : "",
        isLanding ? "min-h-[320px]" : "",
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
      <div className="relative space-y-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {(featured || isBest) && (
            <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/78">
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

        <div className="flex items-start gap-3">
          <LocalSkinImage
            name={name}
            containerClassName={[
              "flex shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-white/8 bg-white/5",
              featured || isBest ? "h-20 w-20" : "h-16 w-16",
            ].join(" ")}
            imageClassName="h-full w-full object-contain p-2"
            placeholderLabel="Skin"
          />

          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="space-y-1.5">
              <p className="max-w-[24ch] text-[clamp(1.05rem,1.5vw,1.35rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-white">
                {name}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/46">
                {routeText}
              </p>
            </div>

            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Estimated profit</p>
                  <p className={`mt-2 text-[clamp(1.9rem,3vw,2.4rem)] font-semibold leading-none tracking-[-0.05em] ${profitClassName}`}>
                    {formattedProfit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">ROI</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatPercent(profitPercentValue, 0)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Buy</p>
                <p className="mt-1 text-base font-semibold text-white">{formatCurrency(buyPrice)}</p>
                <p className="mt-1 text-xs text-white/42">{sourceBuy}</p>
              </div>
              <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Sell</p>
                <p className="mt-1 text-base font-semibold text-white">{formatCurrency(sellPrice)}</p>
                <p className="mt-1 text-xs text-white/42">{sourceSell}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-white/58">
              <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1">
                Score {quality.value}/100
              </span>
              {typeof confidence === "number" ? (
                <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1">
                  Confidence {confidence}%
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1">
                {realSignalText}
              </span>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {renderPrimaryAction()}
              {renderSecondaryAction()}
            </div>
          </div>
        </div>
        {isTracked ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#d5a65a]/20 bg-[#d5a65a]/10 px-4 py-3 text-xs font-medium text-[#f8e7bf]">
            <span>Saved to your tracking list</span>
            <Link href={trackedHref} className="underline underline-offset-4">
              Open tracking
            </Link>
          </div>
        ) : null}

        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-between rounded-2xl border border-white/8 bg-white/3 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/58 hover:bg-white/7 hover:text-white"
            >
              <span>See details</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isDetailsOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {renderMetric("Net after fees", formatCurrency(netSellValue), `Fee ${formattedFeeRate}`)}
              {renderMetric("Exit speed", eta || "Not specified", liquidity ? `Liquidity ${liquidity}` : sellWindow || "Flexible timing")}
              {renderMetric("Confidence", typeof confidence === "number" ? `${confidence}%` : "Unknown", typeof salesLast7d === "number" ? `${salesLast7d} sales / 7d` : undefined)}
              {renderMetric("Stability", stabilityPercent > 0 ? `${stabilityPercent}%` : "Unknown", typeof salesLast30d === "number" ? `${salesLast30d} sales / 30d` : undefined)}
              {renderMetric("Price freshness", priceFreshnessLabel)}
              {renderMetric("Sales freshness", salesFreshnessLabel, rankScore != null ? `Rank ${rankScore}` : undefined)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </article>
  )
}
