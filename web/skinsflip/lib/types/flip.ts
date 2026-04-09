export type Flip = {
  id: string
  name: string
  buyPrice: number
  sellPrice: number
  profit: number
  roi: number
  profitPercent?: number
  rankScore?: number
  sourceBuy: string
  sourceSell: string
  listingCount?: number
  liquidity?: "high" | "medium" | "low"
  confidence?: number
  eta?: string
  sellWindow?: string
  salesLast7d?: number
  salesLast30d?: number
  stabilityScore?: number
  createdAt?: string
}

