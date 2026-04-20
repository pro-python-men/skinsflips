"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth-context";
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

type InventoryRow = InventoryItem & {
  cost: number;
  value: number;
  profit: number;
  roi: number;
};

const SELL_MARKETPLACE = "Skinport";
const SELL_MARKETPLACE_HREF = "https://skinport.com/market";

function getSellRecommendation(row: InventoryRow) {
  if (row.profit > 0 && row.roi >= 10) {
    return {
      label: "Sell now",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (row.profit > 0) {
    return {
      label: "Worth listing",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    };
  }

  return {
    label: "Hold",
    className: "border-border/60 bg-background/20 text-muted-foreground",
  };
}

function getInventoryDecision(row: InventoryRow) {
  const recommendation = getSellRecommendation(row);

  if (recommendation.label === "Sell now") {
    return {
      marketplace: SELL_MARKETPLACE,
      title: `Sell on ${SELL_MARKETPLACE} →`,
      helper: "Best sell opportunity right now",
      actionable: true,
    };
  }

  if (recommendation.label === "Worth listing") {
    return {
      marketplace: SELL_MARKETPLACE,
      title: `List on ${SELL_MARKETPLACE} →`,
      helper: "Profit is available if you want to exit soon",
      actionable: true,
    };
  }

  return {
    marketplace: SELL_MARKETPLACE,
    title: "Hold for now",
    helper: "Wait for a stronger sell price before listing",
    actionable: false,
  };
}

export default function InventoryPage() {
  const { isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [skin, setSkin] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const computed = useMemo(() => {
    const rows: InventoryRow[] = items
      .map((item) => {
        const qty = Number(item.quantity) || 0;
        const buy = Number(item.purchasePrice) || 0;
        const current = Number(item.currentPrice) || 0;
        const cost = buy * qty;
        const value = current * qty;
        const profit = value - cost;
        const roi = cost > 0 ? (profit / cost) * 100 : 0;

        return {
          ...item,
          cost,
          value,
          profit,
          roi,
        };
      })
      .sort((a, b) => b.profit - a.profit);

    const profitableRows = rows.filter((row) => row.profit > 0);
    const holdRows = rows.filter((row) => row.profit <= 0);
    const topOpportunity = profitableRows[0] ?? rows[0] ?? null;
    const totalPotentialProfit = profitableRows.reduce((sum, row) => sum + row.profit, 0);
    const totalValue = rows.reduce((sum, row) => sum + row.value, 0);

    return {
      rows,
      profitableRows,
      holdRows,
      topOpportunity,
      totalPotentialProfit,
      totalValue,
    };
  }, [items]);

  const refresh = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch("/api/inventory");
      setItems(Array.isArray(data) ? (data as InventoryItem[]) : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return;
    refresh();
  }, [isAuthenticated, isLoadingAuth]);

  return (
    <DashboardLayout title="Inventory" requireAuth>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Best sell opportunities in your inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            Start with the skins showing the strongest profit right now.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading inventory opportunities...
          </div>
        ) : computed.rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="mx-auto max-w-2xl space-y-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Turn inventory into sell decisions
              </p>
              <p className="text-2xl font-semibold text-foreground">
                See where each skin is most worth selling before you list anything
              </p>
              <p className="text-sm text-muted-foreground">
                Track your buy price and current best sell price, then let the page surface your strongest exit opportunities first.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    document.getElementById("add-inventory-item")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  Add your first item
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {computed.topOpportunity ? (
              <section className="rounded-2xl border border-emerald-500/25 bg-card p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                      Best sell opportunity
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground">
                      {computed.topOpportunity.skin}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      This is the item to check first if you want to realize profit from your inventory.
                    </p>
                  </div>

                  <div className="space-y-2 text-left lg:text-right">
                    <div
                      className={`text-4xl font-bold ${
                        computed.topOpportunity.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatCurrency(computed.topOpportunity.profit)}
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {formatPercent(computed.topOpportunity.roi, 1)} ROI
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Buy price
                    </div>
                    <div className="mt-1 text-base font-semibold text-foreground">
                      {formatCurrency(computed.topOpportunity.purchasePrice)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Current best sell
                    </div>
                    <div className="mt-1 text-base font-semibold text-foreground">
                      {formatCurrency(computed.topOpportunity.currentPrice)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Quantity
                    </div>
                    <div className="mt-1 text-base font-semibold text-foreground">
                      {computed.topOpportunity.quantity}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Current value
                    </div>
                    <div className="mt-1 text-base font-semibold text-foreground">
                      {formatCurrency(computed.topOpportunity.value)}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Best marketplace to sell right now: {SELL_MARKETPLACE}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current tracked sell price points to the strongest exit opportunity here.
                    </p>
                  </div>
                  <Button asChild className="rounded-xl bg-green-500 px-6 text-black hover:bg-green-600">
                    <a href={SELL_MARKETPLACE_HREF} target="_blank" rel="noreferrer">
                      Sell on {SELL_MARKETPLACE} →
                    </a>
                  </Button>
                </div>
              </section>
            ) : null}

            <section className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Sell decisions
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Where to sell each item next
                </h3>
                <p className="text-sm text-muted-foreground">
                  Open inventory and immediately see the current best exit decision for every position.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {computed.rows.map((row) => {
                  const recommendation = getSellRecommendation(row);
                  const decision = getInventoryDecision(row);

                  return (
                    <article
                      key={row.id}
                      className="rounded-2xl border border-border bg-card p-6"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="text-lg font-semibold text-foreground">{row.skin}</h4>
                          <p className="text-sm text-muted-foreground">
                            Current value {formatCurrency(row.value)} · Qty {row.quantity}
                          </p>
                        </div>
                        <div
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${recommendation.className}`}
                        >
                          {recommendation.label}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Buy price
                          </div>
                          <div className="mt-2 text-lg font-semibold text-foreground">
                            {formatCurrency(row.purchasePrice)}
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Current best sell
                          </div>
                          <div className="mt-2 text-lg font-semibold text-foreground">
                            {formatCurrency(row.currentPrice)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {decision.marketplace}
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Estimated profit
                          </div>
                          <div
                            className={`mt-2 text-lg font-semibold ${
                              row.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {formatCurrency(row.profit)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatPercent(row.roi, 1)} ROI
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border/60 bg-background/20 p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            Recommended action
                          </p>
                          <p className="text-sm text-muted-foreground">{decision.helper}</p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          {decision.actionable ? (
                            <Button asChild className="rounded-xl bg-green-500 text-black hover:bg-green-600">
                              <a href={SELL_MARKETPLACE_HREF} target="_blank" rel="noreferrer">
                                {decision.title}
                              </a>
                            </Button>
                          ) : (
                            <Button variant="secondary" className="rounded-xl" disabled>
                              {decision.title}
                            </Button>
                          )}

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              setDeletingId(row.id);
                              try {
                                await apiFetch(`/api/inventory/${row.id}`, {
                                  method: "DELETE",
                                });
                                toast({ title: "Item deleted" });
                                await refresh();
                              } catch (err: any) {
                                toast({
                                  title: "Could not delete item",
                                  description: err?.message || "Unknown error",
                                  variant: "destructive",
                                });
                              } finally {
                                setDeletingId(null);
                              }
                            }}
                            disabled={deletingId === row.id}
                          >
                            {deletingId === row.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                    Portfolio signal
                  </div>
                  <div className="mt-3 text-3xl font-bold text-foreground">
                    {formatCurrency(computed.totalValue)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Current tracked inventory value.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Sellable profit now
                </div>
                <div className="mt-3 text-3xl font-bold text-emerald-400">
                  {formatCurrency(computed.totalPotentialProfit)}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Total profit currently available across profitable positions.
                </p>
              </div>
            </section>
          </>
        )}

        <section id="add-inventory-item" className="rounded-2xl border border-border bg-card p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Manage tracked inventory</h3>
            <p className="text-sm text-muted-foreground">
              Add another item only when you want this page to evaluate a new sell decision.
            </p>
          </div>

          <form
            className="mt-5 grid gap-4 md:grid-cols-4"
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
                    quantity: Number(quantity),
                  }),
                });

                if (data === null) {
                  toast({
                    title: "Authentication required",
                    description: "You must be logged in to add items",
                    variant: "destructive",
                  });
                  return;
                }

                setSkin("");
                setPurchasePrice("");
                setCurrentPrice("");
                setQuantity("1");
                toast({ title: "Inventory item added", description: `${(data as { skin?: string }).skin ?? "Item"}` });
                await refresh();
              } catch (err: any) {
                toast({
                  title: "Could not add item",
                  description: err?.message || "Unknown error",
                  variant: "destructive",
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
                {saving ? "Saving..." : "Add item"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
