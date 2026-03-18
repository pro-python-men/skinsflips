"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";

type Props = {
  onCreated: () => Promise<void> | void;
};

export function AddFlipForm({ onCreated }: Props) {
  const [skin, setSkin] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Add Flip</h3>

      <form
        className="grid gap-4 md:grid-cols-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const data = await apiFetch("/api/flips", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                skin,
                buyPrice: Number(buyPrice),
                sellPrice: Number(sellPrice)
              })
            });

            if (data === null) {
              toast({
                title: "Zaloguj się przez Steam",
                description: "Twoje konto nie jest zalogowane."
              });
              return;
            }

            setSkin("");
            setBuyPrice("");
            setSellPrice("");
            toast({ title: "Flip added", description: `${data.skin}` });
            await onCreated();
          } catch (err: any) {
            toast({
              title: "Could not add flip",
              description: err?.message || "Unknown error",
              variant: "destructive"
            });
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="md:col-span-1">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Skin name
          </label>
          <Input
            value={skin}
            onChange={(e) => setSkin(e.target.value)}
            placeholder="AK-47 | Redline"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Buy price
          </label>
          <Input
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Sell price
          </label>
          <Input
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
          />
        </div>

        <div className="md:col-span-3">
          <Button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? "Saving…" : "Add flip"}
          </Button>
        </div>
      </form>
    </div>
  );
}

