"use client"

import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { FlipCalculator } from "@/components/flip-calculator"
import { Suspense } from "react"

function CalculatorContent() {
  const searchParams = useSearchParams()
  const buyPrice = parseFloat(searchParams.get("buyPrice") || "0")

  return <FlipCalculator initialBuyPrice={buyPrice} />
}

export default function CalculatorPage() {
  return (
    <DashboardLayout title="Flip Calculator">
      <Suspense fallback={<div>Loading...</div>}>
        <CalculatorContent />
      </Suspense>
    </DashboardLayout>
  )
}
