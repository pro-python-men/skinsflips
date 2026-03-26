"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { formatCurrency, formatPercent } from "@/lib/format"

type Flip = {
  id: string
  skin: string
  buyPrice: number
  sellPrice: number
  profit: number
  roi: number
}

export default function BestFlipsPage() {
  const router = useRouter()
  const [flips, setFlips] = useState<Flip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const sortedFlips = useMemo(() => {
    return [...flips].sort((a, b) => b.roi - a.roi)
  }, [flips])

  const loadFlips = async () => {
    setLoading(true)
    setError("")

    try {
      const data = await apiFetch("/api/flips/best")
      if (data === null) {
        router.replace("/login")
        return
      }

      if (!Array.isArray(data)) {
        throw new Error("Nieoczekiwana odpowiedź serwera")
      }

      setFlips(
        data.map((flip) => ({
          id: String(flip.id),
          skin: String(flip.skin),
          buyPrice: Number(flip.buyPrice),
          sellPrice: Number(flip.sellPrice),
          profit: Number(flip.profit),
          roi: Number(flip.roi),
        }))
      )
    } catch (e: any) {
      setError(e?.message || "Nie udało się załadować najlepszych flipów")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFlips()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <DashboardLayout title="Best Flips" requireAuth>
      <div className="space-y-6">
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Ładowanie najlepszych flipów...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : sortedFlips.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Brak danych o flipach.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold">Najlepsze flipy</h1>
              <Button variant="secondary" size="sm" onClick={loadFlips}>
                Odśwież
              </Button>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="text-left p-2">Skin</th>
                    <th className="text-right p-2">Kupno</th>
                    <th className="text-right p-2">Sprzedaż</th>
                    <th className="text-right p-2">Zysk</th>
                    <th className="text-right p-2">ROI</th>
                    <th className="text-right p-2">Akcja</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFlips.map((flip) => (
                    <tr key={flip.id} className="border-t border-zinc-800">
                      <td className="p-2">{flip.skin}</td>
                      <td className="p-2 text-right">{formatCurrency(flip.buyPrice)}</td>
                      <td className="p-2 text-right">{formatCurrency(flip.sellPrice)}</td>
                      <td className={`p-2 text-right ${flip.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {formatCurrency(flip.profit)}
                      </td>
                      <td className="p-2 text-right">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          flip.roi >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {formatPercent(flip.roi, 1)}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <Button variant="secondary" size="sm">
                          Buy
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
