"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/format";

type InventoryItem = {
  id: string;
  skin: string;
  purchasePrice: number;
  currentPrice: number;
  quantity: number;
  createdAt?: string;
};

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [skin, setSkin] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  const totalValue = useMemo(() => {
    return items.reduce(
      (sum, it) => sum + Number(it.currentPrice) * Number(it.quantity),
      0
    );
  }, [items]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/inventory");
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error((data as any)?.message || "Failed to fetch inventory");
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

  return (
    <DashboardLayout title="Inventory">
      <div className="space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Inventory value:{" "}
            <span className="text-foreground font-semibold">
              {formatCurrency(totalValue)}
            </span>
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
                const res = await fetch("/api/inventory", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    skin,
                    purchasePrice: Number(purchasePrice),
                    currentPrice: Number(currentPrice),
                    quantity: Number(quantity)
                  })
                });

                const data = await res.json().catch(() => null);
                if (res.status === 401) {
                  router.replace("/login");
                  return;
                }
                if (!res.ok) throw new Error(data?.message || `Failed (${res.status})`);

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

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Loading inventory…
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Items</h3>
          {items.length === 0 && !loading ? (
            <div className="text-sm text-muted-foreground">No inventory items yet.</div>
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
                    <th className="text-right p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-t border-zinc-800">
                      <td className="p-2">{it.skin}</td>
                      <td className="p-2 text-right">{formatCurrency(it.purchasePrice)}</td>
                      <td className="p-2 text-right">{formatCurrency(it.currentPrice)}</td>
                      <td className="p-2 text-right">{it.quantity}</td>
                      <td className="p-2 text-right font-semibold">
                        {formatCurrency(Number(it.currentPrice) * Number(it.quantity))}
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/inventory/${it.id}`, { method: "DELETE" });
                              if (res.status === 401) {
                                router.replace("/login");
                                return;
                              }
                              if (res.status !== 204) {
                                const data = await res.json().catch(() => null);
                                throw new Error(data?.message || `Failed (${res.status})`);
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

