import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatPercent } from "@/lib/format"
import type { Flip } from "@/lib/types/flip"

type DealCardProps = Pick<
  Flip,
  | "name"
  | "buyPrice"
  | "sellPrice"
  | "profit"
  | "profitPercent"
  | "sourceBuy"
  | "sourceSell"
  | "liquidity"
  | "confidence"
  | "eta"
  | "rankScore"
> & {
  sellWindow?: Flip["sellWindow"]
  salesLast7d?: Flip["salesLast7d"]
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
  profit,
  profitPercent,
  sourceBuy,
  sourceSell,
  liquidity,
  confidence,
  eta,
  rankScore,
  sellWindow,
  salesLast7d,
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
  const formatEtaText = (value: string | undefined) => {
    if (!value) return "within a few days"
    return String(value).replace(/^~/, "about ")
  }

  const getWhyThisFlipText = () => {
    if (signalText) return signalText
    if (salesCount >= 10 && confidenceValue >= 70) return "High demand + recent sales"
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

  const profitClassName = profit >= 0 ? "text-emerald-400" : "text-red-400"
  const formattedProfit = `${profit >= 0 ? "+" : "-"}${formatCurrency(Math.abs(profit))}`
  const formattedProfitPercent = `(${formatPercent(profitPercent ?? 0, 0)})`
  const salesCount = typeof salesLast7d === "number" ? salesLast7d : 0
  const confidenceValue = Number(confidence ?? 0)
  const stabilityValue = Number(stabilityScore ?? 0)
  const stabilityPercent =
    stabilityValue > 0 && stabilityValue <= 1 ? Math.round(stabilityValue * 100) : Math.round(stabilityValue)
  const sellWindowText = sellWindow ? sellWindow : "n/a"
  const liquidityText = liquidity ? liquidity : "unknown"
  const whyThisFlipText = getWhyThisFlipText()
  const urgencyText = getUrgencyText()
  const liquidityDecisionText = getLiquidityDecisionText()
  const realMarketText = getRealMarketText()
  const scarcityText = getScarcityText()
  const etaDisplay = eta ?? "~7 days"
  const metaText = [
    `Rank ${rankScore ?? "-"}`,
    `Liquidity ${liquidityText}`,
    `Sell window ${sellWindowText}`,
    `Stability ${stabilityPercent}%`,
  ].join(" • ")
  const isLanding = variant === "landing"
  const isClickable = Boolean(onCardClick)
  const buyLabel = `Buy now on ${sourceBuy} →`
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
          className="h-12 w-full rounded-xl bg-emerald-500 text-base font-semibold text-black opacity-45"
        >
          {buyLabel}
        </Button>
      )
    }

    return (
      <Button
        asChild
        className="h-12 w-full rounded-xl bg-green-500 text-base font-semibold text-black shadow-[0_16px_40px_rgba(34,197,94,0.24)] transition hover:bg-green-600"
      >
        <a
          href={buyHref}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          {buyLabel}
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
        className="h-11 w-full rounded-xl border-border/80 bg-transparent text-sm font-medium text-foreground hover:bg-background/50"
      >
        {isTracked ? "Tracking this opportunity" : isTracking ? "Adding to your opportunities..." : "Track this flip"}
      </Button>
    )
  }

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
            <p className="text-sm text-muted-foreground">
              Buy {formatCurrency(buyPrice)} {"\u2192"} Sell {formatCurrency(sellPrice)}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <p className={`text-5xl font-extrabold leading-none ${profitClassName}`}>{formattedProfit}</p>
                <p className="text-lg font-semibold text-emerald-300">{formattedProfitPercent}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/20 px-3 py-2 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Timeline</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{etaDisplay}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-emerald-200">You could make about {formatCurrency(profit)} on this flip</p>
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
                  <span>Now tracking potential profit</span>
                </div>
                <Link href={trackedHref} className="text-emerald-200 underline underline-offset-4">
                  View tracking
                </Link>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Buy price</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(buyPrice)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Target sell</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(sellPrice)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Liquidity</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{liquidityDecisionText}</p>
              <p className="mt-1 text-sm text-muted-foreground">{realMarketText}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{confidenceValue}% confidence</p>
                <p className="text-xs text-muted-foreground">{etaDisplay}</p>
              </div>
              <Progress value={confidenceValue} className="mt-3 h-2 bg-white/10 [&_[data-slot=progress-indicator]]:bg-emerald-400" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{metaText}</p>
        </div>
      </div>
    )
  }

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
        <div className="space-y-1.5">
          {featured || isBest ? (
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              <span>🔥 Best Opportunity</span>
            </div>
          ) : null}
          <p className="text-lg font-semibold text-white">{name}</p>
          <p className="text-sm text-muted-foreground">
            Buy {formatCurrency(buyPrice)} {"\u2192"} Sell {formatCurrency(sellPrice)}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">Profit</p>
          <div className="mt-2 space-y-2">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <p className={`text-5xl font-extrabold leading-none ${profitClassName}`}>{formattedProfit}</p>
                <p className="text-xl font-bold text-emerald-300">{formattedProfitPercent}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/20 px-3 py-2 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Timeline</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{etaDisplay}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-emerald-200">You could make about {formatCurrency(profit)} on this flip</p>
            <p className="text-sm text-muted-foreground">{whyThisFlipText}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300">
                {urgencyText}
              </span>
              <span className="text-muted-foreground">{realMarketText}</span>
            </div>
            <p className="text-xs text-muted-foreground">{scarcityText}</p>
          </div>
        </div>

        <div className="space-y-2">
          {renderPrimaryAction()}
          <p className="text-xs text-muted-foreground">{realMarketText}</p>
          {renderSecondaryAction()}
          {isTracked ? (
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-emerald-300">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Now tracking potential profit</span>
              </div>
              <Link href={trackedHref} className="text-emerald-200 underline underline-offset-4">
                View tracking
              </Link>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Buy price</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(buyPrice)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Buy on {sourceBuy}</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Target sell</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(sellPrice)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Sell on {sourceSell}</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Liquidity</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{liquidityDecisionText}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/60 px-3 py-1 capitalize">
                {liquidityText}
              </span>
              <span className="rounded-full border border-border/60 px-3 py-1">
                {realMarketText}
              </span>
              {eta ? (
                <span className="rounded-full border border-border/60 px-3 py-1">
                  ETA {etaDisplay}
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold text-foreground">{confidenceValue}% confidence</p>
              <p className="text-xs text-muted-foreground">{sellWindowText} window</p>
            </div>
            <Progress value={confidenceValue} className="mt-3 h-2 bg-white/10 [&_[data-slot=progress-indicator]]:bg-emerald-400" />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Stability {stabilityPercent}%</span>
              <span>Rank {rankScore ?? "-"}</span>
            </div>
          </div>
        </div>

        {ctaLabel && ctaHref ? (
          <div className="flex justify-end">
            <Button asChild className="rounded-xl bg-green-500 px-5 py-2.5 font-semibold text-black transition hover:bg-green-600">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
