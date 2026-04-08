export type Flip = {
  id: string
  name: string
  buyPrice: number
  sellPrice: number
  profit: number
  roi: number
  sourceBuy: string
  sourceSell: string
  listingCount?: number
  liquidity?: "high" | "medium" | "low"
  confidence?: number
  eta?: string
  createdAt?: string
}

