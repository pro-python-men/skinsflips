"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

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
    <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-card p-4">
      <div className="min-w-[150px] flex-1">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Date Range
        </label>
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger>
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
          <SelectTrigger>
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
          <SelectTrigger>
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
  )
}
