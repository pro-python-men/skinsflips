export type LiquidityLabel = "low" | "medium" | "high"
export function getLiquidityLabel(listingCount: number): LiquidityLabel {
  if (listingCount > 50) return "high"
  if (listingCount > 10) return "medium"
  return "low"
}

export function calculateConfidence(roi: number, liquidity: LiquidityLabel) {
  let base = roi

  if (liquidity === "high") base += 20
  if (liquidity === "medium") base += 10

  return Math.min(100, Math.round(base))
}

export function isVisibleLiquidity(liquidity: LiquidityLabel) {
  return liquidity !== "low"
}

export function getEtaText(liquidity: LiquidityLabel) {
  return liquidity === "high" ? "Sells fast" : "May take a few days"
}

export function getDemandText(liquidity: LiquidityLabel) {
  return liquidity === "high" ? "High demand" : "Moderate demand"
}

export function getQuickTakeText(liquidity: LiquidityLabel) {
  return liquidity === "high"
    ? "Sells fast, high demand"
    : "Moderate demand, slower sell"
}

export function getConfidenceLabel(confidence: number) {
  if (confidence >= 75) return "Good opportunity"
  return "Worth watching"
}
