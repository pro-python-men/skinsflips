import { formatCurrency } from "@/lib/format"

type DealCardProps = {
  skin: string
  buyPrice: number
  sellPrice: number
  profit: number
}

export function DealCard({ skin, buyPrice, sellPrice, profit }: DealCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-transform transition-colors duration-200 hover:-translate-y-1 hover:border-emerald-400/40">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">{skin}</p>
          <p className="text-xs text-muted-foreground">Based on recent market data</p>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Buy price</p>
            <p className="mt-1 text-base font-medium text-foreground">{formatCurrency(buyPrice)}</p>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Sell price</p>
            <p className="mt-1 text-base font-medium text-foreground">{formatCurrency(sellPrice)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-200/80">Profit</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">{formatCurrency(profit)}</p>
        </div>
      </div>
    </div>
  )
}
