"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardLayout } from "@/components/dashboard-layout";
import { SteamLoginButton } from "@/components/steam-login-button";
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
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await apiFetch("/api/auth/me");
        setAuthorized(Boolean((data as { user?: unknown } | null)?.user));
      } catch {
        setAuthorized(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (authorized !== true) return;
    refresh();
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
              See which skins are ready to sell and where your best profit is building.
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
            <div className="space-y-3 text-center">
              <p className="text-xl font-semibold text-foreground">
                No inventory tracked yet
              </p>
              <p className="text-sm text-muted-foreground">
                Add your first skin to instantly see current profit and whether it is worth selling now.
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
                  Add first item
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
                      Start here
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground">
                      {computed.topOpportunity.skin}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      This is your strongest inventory decision right now based on current tracked prices.
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
                      Buy-in
                    </div>
                    <div className="mt-1 text-base font-semibold text-foreground">
                      {formatCurrency(computed.topOpportunity.purchasePrice)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Current price
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
                      Position value
                    </div>
                    <div className="mt-1 text-base font-semibold text-foreground">
                      {formatCurrency(computed.topOpportunity.value)}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                    Profit ready
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    Sell these first
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Highest-profit positions in your inventory right now.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {computed.profitableRows.length === 0 ? (
                    <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
                      No profitable sell opportunities right now. Your tracked items are better held for now.
                    </div>
                  ) : (
                    computed.profitableRows.slice(0, 6).map((row) => {
                      const recommendation = getSellRecommendation(row);

                      return (
                        <article
                          key={row.id}
                          className="rounded-xl border border-border/60 bg-background/20 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-foreground">{row.skin}</h4>
                              <p className="text-sm text-muted-foreground">
                                Bought at {formatCurrency(row.purchasePrice)} · now {formatCurrency(row.currentPrice)}
                              </p>
                            </div>
                            <div
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${recommendation.className}`}
                            >
                              {recommendation.label}
                            </div>
                          </div>

                          <div className="mt-4 flex items-end justify-between gap-4">
                            <div>
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                Profit
                              </div>
                              <div className="mt-1 text-2xl font-bold text-emerald-400">
                                {formatCurrency(row.profit)}
                              </div>
                            </div>

                            <div className="text-right text-sm">
                              <div className="font-semibold text-foreground">
                                {formatPercent(row.roi, 1)} ROI
                              </div>
                              <div className="text-muted-foreground">
                                Qty {row.quantity} · Value {formatCurrency(row.value)}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Watchlist
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    Hold these for now
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Items that are not yet at a strong sell point.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {computed.holdRows.length === 0 ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
                      Everything in your inventory is currently in profit.
                    </div>
                  ) : (
                    computed.holdRows.slice(0, 6).map((row) => (
                      <article
                        key={row.id}
                        className="rounded-xl border border-border/60 bg-background/20 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-foreground">{row.skin}</h4>
                            <p className="text-sm text-muted-foreground">
                              Bought at {formatCurrency(row.purchasePrice)} · now {formatCurrency(row.currentPrice)}
                            </p>
                          </div>
                          <div className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                            Hold
                          </div>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                              Profit
                            </div>
                            <div
                              className={`mt-1 text-2xl font-bold ${
                                row.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {formatCurrency(row.profit)}
                            </div>
                          </div>

                          <div className="text-right text-sm">
                            <div className="font-semibold text-foreground">
                              {formatPercent(row.roi, 1)} ROI
                            </div>
                            <div className="text-muted-foreground">
                              Qty {row.quantity} · Value {formatCurrency(row.value)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
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
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Portfolio signal
                </div>
                <div className="mt-3 text-3xl font-bold text-foreground">
                  {formatCurrency(computed.totalValue)}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Current tracked inventory value.
                </p>
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
            <h3 className="text-lg font-semibold text-foreground">Add inventory item</h3>
            <p className="text-sm text-muted-foreground">
              Use this only when you want to track another skin.
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
