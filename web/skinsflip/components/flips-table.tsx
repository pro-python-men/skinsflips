"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatCurrency, formatShortDate } from "@/lib/format"

export type Flip = {
  id: string
  skin: string
  buyPrice: number
  sellPrice: number
  profit: number
  roi: number
  date: string
}

type Props = {
  flips: Flip[]
}

export function FlipsTable({ flips }: Props) {
  const [sort, setSort] = useState<{ key: "profit" | "roi" | "date"; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc"
  })
  const [page, setPage] = useState(1)
  const pageSize = 10

  const sorted = useMemo(() => {
    const items = [...flips]
    const mult = sort.dir === "asc" ? 1 : -1

    items.sort((a, b) => {
      if (sort.key === "profit") return mult * (a.profit - b.profit)
      if (sort.key === "roi") return mult * (a.roi - b.roi)
      const da = new Date(a.date).getTime() || 0
      const db = new Date(b.date).getTime() || 0
      return mult * (da - db)
    })

    return items
  }, [flips, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const pageItems = sorted.slice(start, start + pageSize)

  const toggleSort = (key: "profit" | "roi" | "date") => {
    setPage(1)
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "desc" }
      return { key, dir: prev.dir === "desc" ? "asc" : "desc" }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Flips</h2>
        <div className="text-xs text-muted-foreground">
          Page {currentPage} / {totalPages}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="text-zinc-400">
          <tr>
            <th className="text-left p-2">Skin</th>
            <th className="text-left p-2">Buy</th>
            <th className="text-left p-2">Sell</th>
            <th className="text-left p-2">
              <button className="hover:underline" onClick={() => toggleSort("profit")}>
                Profit{sort.key === "profit" ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
              </button>
            </th>
            <th className="text-left p-2">
              <button className="hover:underline" onClick={() => toggleSort("roi")}>
                ROI{sort.key === "roi" ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
              </button>
            </th>
            <th className="text-left p-2">
              <button className="hover:underline" onClick={() => toggleSort("date")}>
                Date{sort.key === "date" ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
  {flips.length === 0 ? (
    <tr>
      <td
        colSpan={6}
        className="text-center text-muted-foreground py-8"
      >
        You haven't added any flips yet.
      </td>
    </tr>
  ) : (
    flips.map((flip) => (
      <tr key={flip.id} className="border-t border-zinc-800">
        <td className="p-2">{flip.skin}</td>
        <td className="p-2">${flip.buyPrice}</td>
        <td className="p-2">${flip.sellPrice}</td>
        <td className="p-2 text-green-400">${flip.profit}</td>
        <td className="p-2">{flip.roi}%</td>
        <td className="p-2">{new Date(flip.date).toLocaleDateString()}</td>
      </tr>
    ))
  )}
</tbody>
      </table>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
