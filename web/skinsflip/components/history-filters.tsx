"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface HistoryFiltersProps {
  dateRange: string
  weapon: string
  profitFilter: string
  onDateRangeChange: (value: string) => void
  onWeaponChange: (value: string) => void
  onProfitFilterChange: (value: string) => void
}

const dateRanges = [
  "All Time",
  "Last 7 Days",
  "Last 30 Days",
  "Last 90 Days",
  "This Year",
]

const weapons = [
  "All Weapons",
  "AK-47",
  "AWP",
  "M4A4",
  "M4A1-S",
  "Glock-18",
  "USP-S",
  "Desert Eagle",
  "Knife",
  "Gloves",
]

const profitFilters = [
  "All",
  "Profitable Only",
  "Losses Only",
]

export function HistoryFilters({
  dateRange,
  weapon,
  profitFilter,
  onDateRangeChange,
  onWeaponChange,
  onProfitFilterChange,
}: HistoryFiltersProps) {
  return (
    <div className="surface-panel rounded-[1.9rem] p-5">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-heading">Refine activity</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">
            Filter your trading history
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Narrow the view by time range, weapon family, or outcome.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="min-w-[150px]">
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Date Range
          </label>
          <Select value={dateRange} onValueChange={onDateRangeChange}>
            <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/4 px-4 transition-colors hover:border-primary/40">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {dateRanges.map((range) => (
                <SelectItem key={range} value={range}>
                  {range}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[150px]">
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Weapon
          </label>
          <Select value={weapon} onValueChange={onWeaponChange}>
            <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/4 px-4 transition-colors hover:border-primary/40">
              <SelectValue placeholder="Select weapon" />
            </SelectTrigger>
            <SelectContent>
              {weapons.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[150px]">
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Profit
          </label>
          <Select value={profitFilter} onValueChange={onProfitFilterChange}>
            <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/4 px-4 transition-colors hover:border-primary/40">
              <SelectValue placeholder="Filter by profit" />
            </SelectTrigger>
            <SelectContent>
              {profitFilters.map((filter) => (
                <SelectItem key={filter} value={filter}>
                  {filter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
