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
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Filters
      </p>

      <div className="flex flex-wrap gap-4">
      <div className="min-w-[150px] flex-1">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Date Range
        </label>
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="h-11 px-4 transition-colors hover:border-emerald-500">
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

      <div className="min-w-[150px] flex-1">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Weapon
        </label>
        <Select value={weapon} onValueChange={onWeaponChange}>
          <SelectTrigger className="h-11 px-4 transition-colors hover:border-emerald-500">
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

      <div className="min-w-[150px] flex-1">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Profit
        </label>
        <Select value={profitFilter} onValueChange={onProfitFilterChange}>
          <SelectTrigger className="h-11 px-4 transition-colors hover:border-emerald-500">
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
