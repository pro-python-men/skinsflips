"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Save, TrendingUp, DollarSign, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface FlipCalculatorProps {
  initialBuyPrice?: number
}

export function FlipCalculator({ initialBuyPrice = 0 }: FlipCalculatorProps) {
  const [buyPrice, setBuyPrice] = useState(initialBuyPrice.toString())
  const [sellPrice, setSellPrice] = useState("")
  const [marketplaceFee, setMarketplaceFee] = useState("13")
  const [tradeHoldDays, setTradeHoldDays] = useState("7")

  useEffect(() => {
    if (initialBuyPrice > 0) {
      setBuyPrice(initialBuyPrice.toString())
    }
  }, [initialBuyPrice])

  const buyPriceNum = parseFloat(buyPrice) || 0
  const sellPriceNum = parseFloat(sellPrice) || 0
  const feePercent = parseFloat(marketplaceFee) || 0
  const holdDays = parseFloat(tradeHoldDays) || 1

  const feeAmount = sellPriceNum * (feePercent / 100)
  const netProfit = sellPriceNum - feeAmount - buyPriceNum
  const roi = buyPriceNum > 0 ? (netProfit / buyPriceNum) * 100 : 0
  const profitPerDay = holdDays > 0 ? netProfit / holdDays : 0

  const handleSaveFlip = () => {
    // Placeholder for API integration
    console.log("Saving flip:", { buyPrice, sellPrice, netProfit, roi })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-6 text-lg font-semibold text-foreground">
          Simulate a Flip
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Buy Price ($)
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="text-lg"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Sell Price ($)
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              className="text-lg"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Marketplace Fee (%)
            </label>
            <Input
              type="number"
              placeholder="13"
              value={marketplaceFee}
              onChange={(e) => setMarketplaceFee(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Steam Market: 13%, Buff163: 2.5%
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Trade Hold Days
            </label>
            <Input
              type="number"
              placeholder="7"
              value={tradeHoldDays}
              onChange={(e) => setTradeHoldDays(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-6 text-lg font-semibold text-foreground">Results</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    netProfit >= 0 ? "text-accent" : "text-destructive"
                  )}
                >
                  {netProfit >= 0 ? "+" : ""}${netProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ROI</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    roi >= 0 ? "text-accent" : "text-destructive"
                  )}
                >
                  {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                <Clock className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profit per Day</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    profitPerDay >= 0 ? "text-foreground" : "text-destructive"
                  )}
                >
                  {profitPerDay >= 0 ? "+" : ""}${profitPerDay.toFixed(2)}/day
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveFlip}
            className="w-full"
            disabled={buyPriceNum <= 0 || sellPriceNum <= 0}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Flip
          </Button>
        </div>
      </div>
    </div>
  )
}
