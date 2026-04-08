import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import type { Flip } from "@/lib/types/flip"

type DealCardProps = Pick<
  Flip,
  "name" | "buyPrice" | "sellPrice" | "profit" | "sourceBuy" | "sourceSell" | "liquidity" | "confidence" | "eta"
> & {
  onTrack?: () => void
  isTracking?: boolean
  featured?: boolean
  isBest?: boolean
  variant?: "default" | "landing"
  signalText?: string
  ctaLabel?: string
  ctaHref?: string
}

export function DealCard({
  name,
  buyPrice,
  sellPrice,
  profit,
  sourceBuy,
  sourceSell,
  liquidity,
  confidence,
  eta,
  onTrack,
  isTracking = false,
  featured = false,
  isBest = false,
  variant = "default",
  signalText,
  ctaLabel,
  ctaHref,
}: DealCardProps) {
  const profitClassName = profit >= 0 ? "text-emerald-400" : "text-red-400"
  const formattedProfit = `${profit >= 0 ? "+" : "-"}${formatCurrency(Math.abs(profit))} profit`
  const etaText =
    eta ??
    (liquidity === "high"
      ? "Sells fast"
      : liquidity === "medium"
        ? "May take a few days"
        : undefined)
  const liquidityText =
    liquidity === "high"
      ? "High demand"
      : liquidity === "medium"
        ? "Moderate demand"
        : undefined
  const isLanding = variant === "landing"

  if (isLanding) {
    return (
      <div className="rounded-xl border border-border bg-zinc-950 p-6 shadow-sm transition-transform transition-colors duration-200 hover:-translate-y-1 hover:border-emerald-400/40">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-white">{name}</p>
            <p className={`text-4xl font-extrabold ${profitClassName}`}>{formattedProfit}</p>
            {signalText ? (
              <p className="text-sm font-medium text-emerald-300">{signalText}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-background/20 p-3 text-sm font-medium text-foreground">
              Buy {formatCurrency(buyPrice)}
            </div>
            <div className="rounded-lg border border-border/60 bg-background/20 p-3 text-sm font-medium text-foreground">
              Sell {formatCurrency(sellPrice)}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Based on recent sales data</p>

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

  return (
    <div className="rounded-xl border border-border bg-zinc-950 p-6 shadow-sm transition-transform transition-colors duration-200 hover:-translate-y-1 hover:border-emerald-400/40">
      <div className="space-y-5">
        <div className="space-y-1.5">
          {featured || isBest ? (
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              <span>🔥 Best Opportunity</span>
            </div>
          ) : null}
          <p className="text-lg font-semibold text-white">{name}</p>
          <p className="text-xs text-muted-foreground">
            Buy on {sourceBuy} {"\u2192"} Sell on {sourceSell}
          </p>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-background/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Buy price</p>
            <p className="mt-1 text-base font-medium text-foreground">{formatCurrency(buyPrice)}</p>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Sell price</p>
            <p className="mt-1 text-base font-medium text-foreground">{formatCurrency(sellPrice)}</p>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs uppercase tracking-wide text-emerald-200/80">Profit</p>
            <p className={`mt-1 text-3xl font-extrabold ${profitClassName}`}>{formattedProfit}</p>
          </div>
        </div>

        {liquidity || typeof confidence === "number" ? (
          <div
            className={[
              "grid gap-3 text-sm",
              liquidity && typeof confidence === "number" ? "sm:grid-cols-3" : "sm:grid-cols-2",
            ].join(" ")}
          >
            {liquidity ? (
              <>
                <div className="rounded-lg border border-border/60 bg-background/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Will it sell?</p>
                  <p className="mt-1 font-medium text-foreground">{etaText}</p>
                </div>

                <div className="rounded-lg border border-border/60 bg-background/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Sells fast</p>
                  <p className="mt-1 font-medium text-foreground">{liquidityText}</p>
                </div>
              </>
            ) : null}

            {typeof confidence === "number" ? (
              <div className="rounded-lg border border-border/60 bg-background/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/80">High confidence</p>
                  <p className="text-sm font-semibold text-foreground">{confidence}%</p>
                </div>
                <Progress value={confidence} className="mt-2 h-2 bg-white/10 [&_[data-slot=progress-indicator]]:bg-emerald-400" />
              </div>
            ) : null}
          </div>
        ) : null}

        {onTrack ? (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={onTrack}
              disabled={isTracking}
              className="rounded-xl bg-green-500 px-5 py-2.5 font-semibold text-black transition hover:bg-green-600"
            >
              {isTracking ? "Tracking..." : "Track flip"}
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
