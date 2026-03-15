"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts"
import { formatShortDate } from "@/lib/format"

type Flip = {
  id: string
  profit: number
  date: string
}

type Props = {
  flips: Flip[]
}

export function ProfitChart({ flips }: Props) {

  const chartData = flips.map((flip, index) => {
    const cumulativeProfit = flips
      .slice(0, index + 1)
      .reduce((sum, f) => sum + f.profit, 0)

    return {
      date: flip.date,
      profit: cumulativeProfit
    }
  })

  return (
    <div className="bg-zinc-900 p-4 rounded-xl">
      <h2 className="text-lg font-semibold mb-4">
        Profit Over Time
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>

          <CartesianGrid stroke="#27272a" />

          <XAxis dataKey="date" stroke="#a1a1aa" tickFormatter={(v) => formatShortDate(String(v))} />

          <YAxis stroke="#a1a1aa" />

          <Tooltip labelFormatter={(label) => formatShortDate(String(label))} />

          <Line
            type="monotone"
            dataKey="profit"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />

        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
