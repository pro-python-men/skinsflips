"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Calculator } from "lucide-react"

export interface SkinItem {
  id: string
  name: string
  weapon: string
  wear: string
  float: number
  price: number
  image: string
}

interface InventoryCardProps {
  item: SkinItem
  onUseInCalculator?: (item: SkinItem) => void
}

export function InventoryCard({ item, onUseInCalculator }: InventoryCardProps) {
  return (
    <div className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg">
      <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-muted/50">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-contain p-2 transition-transform group-hover:scale-105"
        />
      </div>
      <div className="space-y-2">
        <h3 className="truncate text-sm font-medium text-foreground" title={item.name}>
          {item.name}
        </h3>
        <p className="text-xs text-muted-foreground">{item.weapon}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{item.wear}</span>
          <span className="text-xs text-muted-foreground">FV: {item.float.toFixed(4)}</span>
        </div>
        <p className="text-lg font-bold text-foreground">${item.price.toFixed(2)}</p>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => onUseInCalculator?.(item)}
        >
          <Calculator className="mr-2 h-4 w-4" />
          Use in Calculator
        </Button>
      </div>
    </div>
  )
}
