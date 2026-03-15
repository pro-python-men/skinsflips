"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface InventoryFiltersProps {
  weaponType: string
  wearCondition: string
  minPrice: string
  maxPrice: string
  onWeaponTypeChange: (value: string) => void
  onWearConditionChange: (value: string) => void
  onMinPriceChange: (value: string) => void
  onMaxPriceChange: (value: string) => void
}

const weaponTypes = [
  "All Weapons",
  "Rifle",
  "Pistol",
  "SMG",
  "Sniper",
  "Shotgun",
  "Knife",
  "Gloves",
]

const wearConditions = [
  "All Conditions",
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
]

export function InventoryFilters({
  weaponType,
  wearCondition,
  minPrice,
  maxPrice,
  onWeaponTypeChange,
  onWearConditionChange,
  onMinPriceChange,
  onMaxPriceChange,
}: InventoryFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-card p-4">
      <div className="min-w-[150px] flex-1">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Weapon Type
        </label>
        <Select value={weaponType} onValueChange={onWeaponTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select weapon" />
          </SelectTrigger>
          <SelectContent>
            {weaponTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[150px] flex-1">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Wear Condition
        </label>
        <Select value={wearCondition} onValueChange={onWearConditionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            {wearConditions.map((condition) => (
              <SelectItem key={condition} value={condition}>
                {condition}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[120px] flex-1">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Min Price
        </label>
        <Input
          type="number"
          placeholder="$0"
          value={minPrice}
          onChange={(e) => onMinPriceChange(e.target.value)}
        />
      </div>

      <div className="min-w-[120px] flex-1">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Max Price
        </label>
        <Input
          type="number"
          placeholder="$1000"
          value={maxPrice}
          onChange={(e) => onMaxPriceChange(e.target.value)}
        />
      </div>
    </div>
  )
}
