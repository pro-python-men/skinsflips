"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/format";

type InventoryItem = {
  id: string;
  skin: string;
  purchasePrice: number;
  currentPrice: number;
  quantity: number;
  createdAt?: string;
};

export default function InventoryPage() {


  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [skin, setSkin] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  type InventoryRow = InventoryItem & {
    cost: number;
    value: number;
    profit: number;
    roi: number;
  };

  const computed = useMemo(() => {
    const rows: InventoryRow[] = items.map((it) => {
      const quantity = Number(it.quantity) || 0;
      const purchasePrice = Number(it.purchasePrice) || 0;
      const currentPrice = Number(it.currentPrice) || 0;

      const cost = purchasePrice * quantity;
      const value = currentPrice * quantity;
      const profit = value - cost;
      const roi = cost > 0 ? (profit / cost) * 100 : 0;

      return { ...it, cost, value, profit, roi };
    });

    const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
    const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
    const totalProfit = totalValue - totalCost;
    const totalRoi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    const winners = rows.filter((r) => r.profit > 0).length;
    const losers = rows.filter((r) => r.profit < 0).length;

    const best = rows.reduce<InventoryRow | null>((acc, r) => {
      if (!acc) return r;
      return r.profit > acc.profit ? r : acc;
    }, null);

    const worst = rows.reduce<InventoryRow | null>((acc, r) => {
      if (!acc) return r;
      return r.profit < acc.profit ? r : acc;
    }, null);

    return {
      rows,
      totals: {
        totalCost,
        totalValue,
        totalProfit,
        totalRoi,
        winners,
        losers,
        best,
        worst
      }
    };
  }, [items]);

  // 🔥 AUTH CHECK


  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/inventory");
      if (data === null) {
        setItems([]);
        setLoading(false);
        return;
      }
      setItems(Array.isArray(data) ? (data as InventoryItem[]) : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔥 LOADING AUTH
  return (
    <DashboardLayout title="Inventory" requireAuth>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Inventory value:{" "}
              <span className="text-foreground font-semibold">
                {formatCurrency(computed.totals.totalValue)}
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              Cost basis:{" "}
              <span className="text-foreground font-semibold">
                {formatCurrency(computed.totals.totalCost)}
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              P/L:{" "}
              <span
                className={`font-semibold ${
                  computed.totals.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(computed.totals.totalProfit)}
              </span>{" "}
              <span className="text-muted-foreground">
                ({formatPercent(computed.totals.totalRoi, 1)})
              </span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            On profit: <span className="text-foreground font-medium">{computed.totals.winners}</span>{" "}
            • On loss: <span className="text-foreground font-medium">{computed.totals.losers}</span>
            {computed.totals.best ? (
              <>
                {" "}
                • Best:{" "}
                <span className="text-foreground font-medium">
                  {computed.totals.best.skin}
                </span>{" "}
                (<span className="text-emerald-400">{formatCurrency(computed.totals.best.profit)}</span>)
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Add item</h3>
          <form
            className="grid gap-4 md:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                const data = await apiFetch("/api/inventory", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    skin,
                    purchasePrice: Number(purchasePrice),
                    currentPrice: Number(currentPrice),
                    quantity: Number(quantity)
                  })
                });

                if (data === null) {
                  toast({
                    title: "Zaloguj się",
                    description: "Sesja wygasła lub nie jesteś zalogowany.",
                    variant: "destructive"
                  });
                  return;
                }
                setSkin("");
                setPurchasePrice("");
                setCurrentPrice("");
                setQuantity("1");
                toast({ title: "Inventory item added", description: `${data.skin}` });
                await refresh();
              } catch (err: any) {
                toast({
                  title: "Could not add item",
                  description: err?.message || "Unknown error",
                  variant: "destructive"
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Skin
              </label>
              <Input
                value={skin}
                onChange={(e) => setSkin(e.target.value)}
                placeholder="AWP | Asiimov"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Purchase price
              </label>
              <Input
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Current price
              </label>
              <Input
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Quantity
              </label>
              <Input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="numeric"
                placeholder="1"
              />
            </div>

            <div className="md:col-span-4">
              <Button type="submit" disabled={saving} className="w-full md:w-auto">
                {saving ? "Saving…" : "Add item"}
              </Button>
            </div>
          </form>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Loading inventory…
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Items</h3>

          {computed.rows.length === 0 && !loading ? (
            <div className="text-sm text-muted-foreground">
              No inventory items yet.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="text-left p-2">Skin</th>
                    <th className="text-right p-2">Purchase</th>
                    <th className="text-right p-2">Current</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Value</th>
                    <th className="text-right p-2">P/L</th>
                    <th className="text-right p-2">ROI</th>
                    <th className="text-right p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {computed.rows.map((it) => (
                    <tr key={it.id} className="border-t border-zinc-800">
                      <td className="p-2">{it.skin}</td>
                      <td className="p-2 text-right">{formatCurrency(it.purchasePrice)}</td>
                      <td className="p-2 text-right">{formatCurrency(it.currentPrice)}</td>
                      <td className="p-2 text-right">{it.quantity}</td>
                      <td className="p-2 text-right font-semibold">
                        {formatCurrency(it.value)}
                      </td>
                      <td
                        className={`p-2 text-right font-semibold ${
                          it.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(it.profit)}
                      </td>
                      <td className="p-2 text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            it.roi >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {formatPercent(it.roi, 1)}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            try {
                              const data = await apiFetch(`/api/inventory/${it.id}`, {
                                method: "DELETE"
                              });

                              if (data === null) {
                                toast({
                                  title: "Zaloguj się",
                                  description: "Sesja wygasła lub nie jesteś zalogowany.",
                                  variant: "destructive"
                                });
                                return;
                              }
                              toast({ title: "Item deleted" });
                              await refresh();
                            } catch (err: any) {
                              toast({
                                title: "Could not delete item",
                                description: err?.message || "Unknown error",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
