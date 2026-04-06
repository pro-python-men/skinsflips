"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardLayout } from "@/components/dashboard-layout";
import { SteamLoginButton } from "@/components/steam-login-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/format";

const DEV_MODE = true;

type InventoryItem = {
  id: string;
  skin: string;
  purchasePrice: number;
  currentPrice: number;
  quantity: number;
  profit: number;
  roi: number;
  bestMarket: string;
  bestSell?: {
    market: string;
    price: number;
    profit: number;
    roi: number;
  };
  createdAt?: string;
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [mounted, setMounted] = useState(false);

  const [skin, setSkin] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  type InventoryRow = InventoryItem & {
    cost: number;
    value: number;
  };

  const computed = useMemo(() => {
    const rows: InventoryRow[] = items.map((it) => {
      const quantity = Number(it.quantity) || 0;
      const purchasePrice = Number(it.purchasePrice) || 0;
      const currentPrice = Number(it.currentPrice) || 0;

      const cost = purchasePrice * quantity;
      const value = currentPrice * quantity;

      return { ...it, cost, value };
    });

    const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
    const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
    const totalProfit = rows.reduce((sum, r) => sum + r.profit, 0);
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

    const bestSellOpportunity = items.reduce<InventoryItem | null>((acc, item) => {
      if (!acc) return item;
      const accRoi = acc.bestSell?.roi ?? 0;
      const itemRoi = item.bestSell?.roi ?? 0;
      return itemRoi > accRoi ? item : acc;
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
        worst,
        bestSellOpportunity
      }
    };
  }, [items]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/inventory/profit");
      if (!data) {
        setItems([]);
        setLoading(false);
        return;
      }
      if (Array.isArray(data) && data.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      const itemsWithBestSell = (Array.isArray(data) ? (data as InventoryItem[]) : []).map((item) => {
        if (!item.bestSell) {
          const sellPrice = item.currentPrice * (1 + (5 + Math.random() * 15) / 100);
          const sellProfit = sellPrice - item.purchasePrice;
          const sellRoi = item.purchasePrice > 0 ? (sellProfit / item.purchasePrice) * 100 : 0;
          return {
            ...item,
            bestSell: {
              market: ["Skinport", "Buff", "Steam"][Math.floor(Math.random() * 3)],
              price: sellPrice,
              profit: sellProfit,
              roi: sellRoi
            }
          };
        }
        return item;
      });
      setItems(itemsWithBestSell);
    } catch (e: any) {
      if (e?.message?.includes("405") || e?.message?.includes("Method Not Allowed")) {
        setItems([]);
        setError("");
        setLoading(false);
        return;
      }
      setError(e?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await apiFetch("/api/auth/me");
        setAuthorized(Boolean((data as any)?.user));
      } catch {
        setAuthorized(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (authorized !== true) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  if (!mounted) return null;

  if (authorized === null) {
    return (
      <DashboardLayout title="Inventory">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-sm text-muted-foreground">Checking your account...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (authorized === false) {
    return (
      <DashboardLayout title="Inventory">
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-[0_24px_80px_-40px_rgba(16,185,129,0.35)]">
            <h2 className="text-3xl font-semibold text-foreground">
              Unlock your inventory profit opportunities
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              See where to sell your skins for the highest price across multiple marketplaces
            </p>
            <div className="mt-6">
              <SteamLoginButton
                href="/api/auth/steam"
                useButtonWrapper
                buttonClassName="bg-[#1b2838] text-white hover:bg-[#2a475e]"
                anchorClassName="inline-flex"
              />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Inventory">
      <div className="space-y-6">
        <div className="text-xs text-muted-foreground">
          Demo mode — prices are simulated
        </div>

        {/* Portfolio Stats Dashboard */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Section 1: Portfolio Value */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Portfolio Value</div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(computed.totals.totalValue)}
              </div>
              <div className="text-xs text-muted-foreground">
                Cost: {formatCurrency(computed.totals.totalCost)}
              </div>
            </div>
          </div>

          {/* Section 2: Total Profit */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Profit/Loss</div>
            <div className="mt-3 flex items-baseline gap-2">
              <div
                className={`text-2xl font-bold ${
                  computed.totals.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(computed.totals.totalProfit)}
              </div>
              <div
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  computed.totals.totalRoi >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {formatPercent(computed.totals.totalRoi, 1)}
              </div>
            </div>
          </div>

          {/* Section 3: Insights */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Insights</div>
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Profitable items:</span>{" "}
                <span className="font-semibold text-emerald-400">{computed.totals.winners}</span>
                <span className="text-muted-foreground"> / Losing:</span>{" "}
                <span className="font-semibold text-rose-400">{computed.totals.losers}</span>
              </div>
              {computed.totals.best ? (
                <div>
                  <span className="text-muted-foreground">Top:</span>{" "}
                  <span className="font-semibold text-emerald-400">
                    {computed.totals.best.skin}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Add item</h3>
            <button
              type="button"
              onClick={() => {
                setSkin("AWP | Asiimov");
                setPurchasePrice("100");
                setCurrentPrice("120");
                setQuantity("1");
              }}
              className="text-xs px-3 py-1 rounded border border-muted-foreground text-muted-foreground hover:border-foreground hover:text-foreground transition"
            >
              Try example
            </button>
          </div>
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
                  if (DEV_MODE) {
                    console.log("DEV MODE: skipping auth");

                    const newItem = {
                      id: Math.random().toString(),
                      skin,
                      purchasePrice: Number(purchasePrice),
                      currentPrice: Number(currentPrice),
                      quantity: Number(quantity),
                      profit:
                        (Number(currentPrice) - Number(purchasePrice)) * Number(quantity),
                      roi:
                        Number(purchasePrice) > 0
                          ? ((Number(currentPrice) - Number(purchasePrice)) /
                              Number(purchasePrice)) *
                            100
                          : 0,
                      bestMarket: "Skinport"
                    };

                    setItems((prev) => [...prev, newItem]);

                    setSkin("");
                    setPurchasePrice("");
                    setCurrentPrice("");
                    setQuantity("1");

                    setSaving(false);
                    return;
                  }

                  toast({
                    title: "Authentication required",
                    description: "You must be logged in to add items",
                  });
                  setSaving(false);
                  return;
                }

                setSkin("");
                setPurchasePrice("");
                setCurrentPrice("");
                setQuantity("1");
                toast({ title: "Inventory item added", description: `${(data as any).skin}` });
                await refresh();
              } catch (err: any) {
                // Handle 405 errors gracefully in demo mode
                if (err?.message?.includes("405") || err?.message?.includes("Method Not Allowed")) {
                  const newItem = {
                    id: Math.random().toString(),
                    skin,
                    purchasePrice: Number(purchasePrice),
                    currentPrice: Number(currentPrice),
                    quantity: Number(quantity),
                    profit:
                      (Number(currentPrice) - Number(purchasePrice)) * Number(quantity),
                    roi:
                      Number(purchasePrice) > 0
                        ? ((Number(currentPrice) - Number(purchasePrice)) /
                            Number(purchasePrice)) *
                          100
                        : 0,
                    bestMarket: "Skinport"
                  };

                  setItems((prev) => [...prev, newItem]);
                  setSkin("");
                  setPurchasePrice("");
                  setCurrentPrice("");
                  setQuantity("1");
                  toast({ title: "Item added (demo mode)" });
                  setSaving(false);
                  return;
                }

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

        {computed.totals.bestSellOpportunity && (
          <div className="rounded-xl border border-green-500/30 bg-card p-5">
            <div className="mb-3 text-xs text-green-400">🔥 Best sell opportunity</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Skin</div>
                <div className="mt-1 text-lg font-bold text-foreground">
                  {computed.totals.bestSellOpportunity.skin}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Best Market</div>
                <div className="mt-1">
                  <Badge>{computed.totals.bestSellOpportunity.bestSell?.market}</Badge>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Sell Price</div>
                <div className="mt-1 text-lg font-bold text-foreground">
                  {formatCurrency(computed.totals.bestSellOpportunity.bestSell?.price || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Profit</div>
                <div
                  className={`mt-1 text-lg font-bold ${
                    (computed.totals.bestSellOpportunity.bestSell?.profit || 0) >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {formatCurrency(computed.totals.bestSellOpportunity.bestSell?.profit || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">ROI</div>
                <div className="mt-1 inline-flex rounded-full bg-green-500/20 px-3 py-1 text-sm font-semibold text-green-400">
                  {formatPercent(computed.totals.bestSellOpportunity.bestSell?.roi || 0, 1)}
                </div>
              </div>
              <div className="flex items-end">
                <button className="w-full rounded-lg bg-green-500 py-2 font-semibold text-black hover:bg-green-400 transition">
                  Sell now
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Items</h3>
          
          <div className="text-xs text-muted-foreground mb-3">
            Showing profit and best selling option per item
          </div>

          {computed.rows.length === 0 && !loading ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              <div>No items yet</div>
              <div className="text-xs mt-2">Add one or try example to see profit analysis</div>
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
                    <th className="text-left p-2">Best Market</th>
                    <th className="text-right p-2">Best Price</th>
                    <th className="text-right p-2">Profit</th>
                    <th className="text-right p-2">ROI (%)</th>
                    <th className="text-right p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {computed.rows.map((it) => (
                    <tr key={it.id} className="border-t border-zinc-800 hover:bg-muted/50 transition-colors">
                      <td className="p-2">{it.skin}</td>
                      <td className="p-2 text-right text-xs text-muted-foreground">{formatCurrency(it.purchasePrice)}</td>
                      <td className="p-2 text-right text-xs text-muted-foreground">{formatCurrency(it.currentPrice)}</td>
                      <td className="p-2 text-right text-xs text-muted-foreground">{it.quantity}</td>
                      <td className="p-2 text-right text-xs text-muted-foreground font-semibold">
                        {formatCurrency(it.value)}
                      </td>
                      <td
                        className={`p-2 text-right text-lg font-bold ${
                          it.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(it.profit)}
                      </td>
                      <td className="p-2 text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            it.roi >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {formatPercent(it.roi, 1)}
                        </span>
                      </td>
                      <td className="p-2">
                        <Badge variant="secondary">{it.bestMarket}</Badge>
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
                                if (DEV_MODE) {
                                  console.log("DEV MODE: deleting item locally");
                                  setItems((prev) => prev.filter((item) => item.id !== it.id));
                                  toast({ title: "Item deleted" });
                                  return;
                                }

                                toast({
                                  title: "Authentication required",
                                  description: "Your session expired or you are not logged in.",
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
