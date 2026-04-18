export type Flip = {
  id: string
  itemName?: string
  name: string
  buyPrice: number
  sellPrice: number
  netSell?: number
  profit: number
  roi: number
  profitPercent?: number
  rankScore?: number
  sourceBuy: string
  sourceSell: string
  listingCount?: number
  liquidity?: "high" | "medium" | "low"
  liquidityTier?: "HIGH" | "MEDIUM" | "LOW"
  confidence?: number
  eta?: string
  sellWindow?: string
  salesLast7d?: number
  salesLast30d?: number
  stabilityScore?: number
  createdAt?: string
}

export type BestFlipsResponse = {
  flips: Flip[]
  isCached: boolean
  lastUpdated: number | null
}

