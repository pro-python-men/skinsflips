"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatShortDate } from "@/lib/format"

interface ROIDataPoint {
  date: string
  roi: number
}

interface ROIChartProps {
  data: ROIDataPoint[]
}

export function ROIChart({ data }: ROIChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">ROI Over Time</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => formatShortDate(String(v))}
              stroke="#94A3B8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94A3B8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1E293B",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#F1F5F9",
              }}
              labelFormatter={(label) => formatShortDate(String(label))}
              formatter={(value: number) => [`${value.toFixed(1)}%`, "ROI"]}
            />
            <Line
              type="monotone"
              dataKey="roi"
              stroke="#22C55E"
              strokeWidth={2}
              dot={{ fill: "#22C55E", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#22C55E" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
