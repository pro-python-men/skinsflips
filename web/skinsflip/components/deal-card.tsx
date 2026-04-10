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
  onTrack?: () => void
  isTracking?: boolean
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
  onTrack,
  isTracking = false,
  featured = false,
  isBest = false,
  variant = "default",
  signalText,
  ctaLabel,
  ctaHref,
  onCardClick,
}: DealCardProps) {
  const profitClassName = profit >= 0 ? "text-emerald-400" : "text-red-400"
  const formattedProfit = `${profit >= 0 ? "+" : "-"}${formatCurrency(Math.abs(profit))}`
  const formattedProfitPercent = `(${formatPercent(profitPercent ?? 0, 0)})`
  const salesCount = typeof salesLast7d === "number" ? salesLast7d : 0
  const speedLabel =
    salesCount > 20
      ? "Sells very fast"
      : salesCount >= 10
        ? "High demand"
        : salesCount >= 3
          ? "Sells moderately"
          : "Slow market"
  const confidenceValue = Number(confidence ?? 0)
  const stabilityValue = Number(stabilityScore ?? 0)
  const stabilityPercent =
    stabilityValue > 0 && stabilityValue <= 1 ? Math.round(stabilityValue * 100) : Math.round(stabilityValue)
  const sellWindowText = sellWindow ? sellWindow : "n/a"
  const liquidityText = liquidity ? liquidity : "unknown"
  const metaText = [
    `Rank ${rankScore ?? "-"}`,
    `Liquidity ${liquidityText}`,
    `Sell window ${sellWindowText}`,
    `Stability ${stabilityPercent}%`,
  ].join(" • ")
  const isLanding = variant === "landing"
  const isClickable = Boolean(onCardClick)
  const containerClassName = [
    "rounded-xl border border-border bg-zinc-950 p-6 shadow-sm transition-transform transition-colors duration-200 hover:-translate-y-1 hover:border-emerald-400/40",
    isClickable ? "cursor-pointer" : "",
  ].join(" ")

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
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-white">{name}</p>
            <p className="text-sm text-muted-foreground">
              Buy {formatCurrency(buyPrice)} {"\u2192"} Sell {formatCurrency(sellPrice)}
            </p>
          </div>

          <div className="space-y-1">
            <p className={`text-5xl font-extrabold leading-none ${profitClassName}`}>{formattedProfit}</p>
            <p className="text-lg font-semibold text-emerald-300">{formattedProfitPercent}</p>
            <p className="text-xs text-muted-foreground">Based on real sales data</p>
            {signalText ? (
              <p className="text-sm font-medium text-emerald-300">{signalText}</p>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/60 bg-background/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sell speed</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{speedLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">Based on last 7d sales</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{confidenceValue}% confidence</p>
              <p className="text-xs text-muted-foreground">{salesCount} sold</p>
            </div>
            <Progress value={confidenceValue} className="mt-3 h-2 bg-white/10 [&_[data-slot=progress-indicator]]:bg-emerald-400" />
          </div>

          <p className="text-xs text-muted-foreground">{metaText}</p>

          {ctaLabel && ctaHref ? (
            <div className="flex justify-end">
              <Button asChild className="rounded-xl bg-green-500 px-5 py-2.5 font-semibold text-black transition hover:bg-green-600">
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
            </div>
          ) : onTrack ? (
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onTrack()
                }}
                disabled={isTracking}
                className="rounded-xl bg-green-500 px-5 py-2.5 font-semibold text-black transition hover:bg-green-600"
              >
                {isTracking ? "Loading..." : "View deal"}
              </Button>
            </div>
          ) : null}
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
          <div className="mt-2 space-y-1">
            <p className={`text-5xl font-extrabold leading-none ${profitClassName}`}>{formattedProfit}</p>
            <p className="text-xl font-bold text-emerald-300">{formattedProfitPercent}</p>
            <p className="text-xs text-muted-foreground">Based on real sales data</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sell speed</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{speedLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">Based on last 7d sales</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/60 px-3 py-1">
              {salesCount} salesLast7d
            </span>
            <span className="rounded-full border border-border/60 px-3 py-1 capitalize">
              liquidity {liquidityText}
            </span>
            {eta ? (
              <span className="rounded-full border border-border/60 px-3 py-1">
                {eta}
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-foreground">{confidenceValue}% confidence</p>
            <p className="text-xs text-muted-foreground">
              {sourceBuy} {"\u2192"} {sourceSell}
            </p>
          </div>
          <Progress value={confidenceValue} className="mt-3 h-2 bg-white/10 [&_[data-slot=progress-indicator]]:bg-emerald-400" />
        </div>

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background/10 p-3">
            Sell window: {sellWindowText}
          </div>
          <div className="rounded-lg border border-border/60 bg-background/10 p-3">
            Stability: {stabilityPercent}%
          </div>
          <div className="rounded-lg border border-border/60 bg-background/10 p-3">
            Rank score: {rankScore ?? "-"}
          </div>
          <div className="rounded-lg border border-border/60 bg-background/10 p-3 capitalize">
            Liquidity: {liquidityText}
          </div>
        </div>

        {onTrack ? (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onTrack()
              }}
              disabled={isTracking}
              className="rounded-xl bg-green-500 px-5 py-2.5 font-semibold text-black transition hover:bg-green-600"
            >
              {isTracking ? "Loading..." : "View deal"}
            </Button>
          </div>
        ) : ctaLabel && ctaHref ? (
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
