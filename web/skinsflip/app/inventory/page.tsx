"use client";

import { useEffect, useMemo, useState } from "react";
import { DownloadCloud, Link2 } from "lucide-react";

import { useAuth } from "@/components/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { LocalSkinImage } from "@/components/local-skin-image";
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

type InventorySourceStatus = {
  source: "manual" | "steam";
  connected: boolean;
  syncSupported: boolean;
  steamId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  inventoryAppId: number;
  inventoryContextId: string;
};

type SteamInventoryItem = {
  assetId: string;
  classId: string;
  instanceId: string;
  amount: number;
  appId: number;
  contextId: string;
  name: string;
  marketHashName: string | null;
  type: string | null;
  tradable: boolean;
  marketable: boolean;
  commodity: boolean;
  iconUrl: string | null;
  rarity: string | null;
  exterior: string | null;
  source: "steam";
  sellStatus:
    | "sellable"
    | "not_tradable"
    | "not_marketable"
    | "missing_name"
    | "no_market_data"
    | "incomplete_market_data";
  sellReason: string;
  pricing: {
    bestMarketplace: string | null;
    bestPrice: number | null;
    bestNetPrice: number | null;
    bestFeeRate: number | null;
    bestReference: string | null;
    markets: Array<{
      marketplace: string;
      price: number;
      netPrice: number;
      feeRate: number;
      fee: number;
      reference: string;
      volume: number | null;
      isCached: boolean;
      rateLimited: boolean;
      url: string | null;
    }>;
  };
};

type SteamInventorySyncResponse = {
  source: "steam";
  steamId: string;
  fetchedAt: string;
  counts: {
    importedItems: number;
    totalInventoryCount: number;
    tradableItems: number;
    marketableItems: number;
    pagesFetched: number;
    pricedItems: number;
  };
  marketplaces: {
    enabled: string[];
    uniqueItemsProcessed: number;
    skippedUniqueNames: number;
  };
  items: SteamInventoryItem[];
};

const EMPTY_PRICING: SteamInventoryItem["pricing"] = {
  bestMarketplace: null,
  bestPrice: null,
  bestNetPrice: null,
  bestFeeRate: null,
  bestReference: null,
  markets: [],
};

function getMarketplaceHref(marketplace: string, item: SteamInventoryItem) {
  const query = encodeURIComponent(item.marketHashName || item.name);

  if (marketplace === "Skinport") {
    return `https://skinport.com/market?search=${query}`;
  }

  if (marketplace === "CSFloat") {
    return `https://csfloat.com/search?market_hash_name=${query}`;
  }

  if (marketplace === "BUFF Market") {
    return `https://buff.market/market/csgo?search=${query}`;
  }

  return null;
}

function getSteamSellBadge(item: SteamInventoryItem) {
  if (item.sellStatus === "sellable") {
    return {
      label: "Sellable",
      className: "border-[#d5a65a]/25 bg-[#d5a65a]/10 text-[#f1c87a]",
    };
  }

  if (item.sellStatus === "not_tradable" || item.sellStatus === "not_marketable") {
    return {
      label: "Cannot sell now",
      className: "border-rose-500/25 bg-rose-500/10 text-rose-300",
    };
  }

  return {
    label: "Need market data",
    className: "border-white/10 bg-background/60 text-muted-foreground",
  };
}

const SELL_MARKETPLACE = "Skinport";
const SELL_MARKETPLACE_HREF = "https://skinport.com/market";

function getSellRecommendation(row: InventoryRow) {
  if (row.profit > 0 && row.roi >= 10) {
    return {
      label: "Sell now",
      className: "border-[#d5a65a]/30 bg-[#d5a65a]/12 text-[#f1c87a]",
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
    className: "border-white/10 bg-white/4 text-muted-foreground",
  };
}

function getInventoryDecision(row: InventoryRow) {
  const recommendation = getSellRecommendation(row);

  if (recommendation.label === "Sell now") {
    return {
      marketplace: SELL_MARKETPLACE,
      title: `Sell on ${SELL_MARKETPLACE}`,
      helper: "Best sell opportunity right now",
      actionable: true,
    };
  }

  if (recommendation.label === "Worth listing") {
    return {
      marketplace: SELL_MARKETPLACE,
      title: `List on ${SELL_MARKETPLACE}`,
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
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [sourceStatus, setSourceStatus] = useState<InventorySourceStatus | null>(null);
  const [steamSync, setSteamSync] = useState<SteamInventorySyncResponse | null>(null);
  const [steamSyncError, setSteamSyncError] = useState("");
  const [steamLoaded, setSteamLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncingSteam, setSyncingSteam] = useState(false);

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
    const topOpportunity = profitableRows[0] ?? rows[0] ?? null;
    const totalPotentialProfit = profitableRows.reduce((sum, row) => sum + row.profit, 0);
    const totalValue = rows.reduce((sum, row) => sum + row.value, 0);

    return {
      rows,
      profitableRows,
      topOpportunity,
      totalPotentialProfit,
      totalValue,
    };
  }, [items]);

  const loadSourceStatus = async () => {
    try {
      const data = await apiFetch("/api/inventory/source");
      const nextStatus = (data as InventorySourceStatus | null) ?? null;
      setSourceStatus(nextStatus);
      return nextStatus;
    } catch {
      setSourceStatus(null);
      return null;
    }
  };

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

  const loadSteamInventory = async ({ silent = false }: { silent?: boolean } = {}) => {
    setSyncingSteam(true);
    setSteamSyncError("");

    try {
      const data = await apiFetch("/api/inventory/sync", {
        method: "POST",
      });

      const payload = (data as SteamInventorySyncResponse | null) ?? null;
      setSteamSync(payload);

      if (!silent) {
        toast({
          title: "Steam inventory synced",
          description: payload
            ? `${payload.counts.importedItems} items imported from Steam`
            : "Inventory import completed",
        });
      }
    } catch (err: any) {
      const message = err?.message || "Could not import Steam inventory";
      setSteamSync(null);
      setSteamSyncError(message);

      if (!silent) {
        toast({
          title: "Steam sync failed",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setSteamLoaded(true);
      setSyncingSteam(false);
    }
  };

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return;

    let cancelled = false;

    const initializeInventory = async () => {
      const status = await loadSourceStatus();
      if (cancelled) return;

      await refresh();
      if (cancelled) return;

      if (status?.syncSupported) {
        await loadSteamInventory({ silent: true });
        if (cancelled) return;
      } else {
        setSteamSync(null);
        setSteamSyncError("");
        setSteamLoaded(true);
      }
    };

    void initializeInventory();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoadingAuth]);

  const handleSyncSteamInventory = async () => {
    await loadSteamInventory();
    await loadSourceStatus();
  };

  return (
    <DashboardLayout title="Inventory" requireAuth>
      <div className="space-y-6">
        <section className="surface-panel rounded-[2rem] p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_420px] xl:items-start">
            <div className="space-y-2">
              <p className="section-heading">Steam inventory workspace</p>
              <h1 className="text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">
                Steam inventory
              </h1>
              <p className="max-w-[52ch] text-sm text-muted-foreground">
                Syncuj publiczne inventory Steam i przeglądaj itemy w jednym miejscu.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Inventory source
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {user?.displayName || user?.email || "Steam account"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {sourceStatus?.steamId ? `Steam ID ${sourceStatus.steamId}` : "Steam account not connected"}
                  </p>
                </div>
                <div className="rounded-full border border-[#d5a65a]/25 bg-[#d5a65a]/10 px-3 py-1 text-xs font-semibold text-[#f1c87a]">
                  {sourceStatus?.connected ? "Steam connected" : "Manual mode"}
                </div>
              </div>

              <div className="mt-4 rounded-[1.3rem] border border-white/8 bg-background/40 p-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {sourceStatus?.connected ? "Import your Steam items" : "Steam connection required"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sourceStatus?.connected
                        ? "Sync inventory first, then review where each item is most worth selling."
                        : "Connect Steam first to start importing inventory automatically."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.1rem] border border-white/8 bg-white/4 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Next step
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        Sync inventory
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Import current Steam items into the sell view below.
                      </p>
                    </div>
                    <div className="rounded-[1.1rem] border border-white/8 bg-white/4 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Goal
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        Find the best place to sell
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Compare visible items and move straight to the best marketplace.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      type="button"
                      className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-1"
                      disabled={!sourceStatus?.syncSupported || syncingSteam}
                      onClick={() => {
                        void handleSyncSteamInventory();
                      }}
                    >
                      {syncingSteam ? "Synchronizuję..." : "Sync Steam inventory"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-full sm:flex-1"
                      onClick={() => {
                        void loadSourceStatus();
                      }}
                    >
                      Odśwież status
                    </Button>
                  </div>
                </div>
              </div>

              {steamSyncError ? (
                <div className="mt-4 rounded-[1.3rem] border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {steamSyncError}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="section-heading">Imported Steam items</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
                Steam inventory feed
              </h2>
              <p className="max-w-[64ch] text-sm text-muted-foreground">
                This section compares all fetched marketplace prices and shows the highest current sell price for each Steam item.
              </p>
            </div>

            {steamSync ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <div className="status-pill">
                  {steamSync.counts.importedItems} imported
                </div>
                <div className="status-pill">
                  {steamSync.counts.tradableItems} tradable
                </div>
                <div className="status-pill">
                  {steamSync.counts.marketableItems} marketable
                </div>
                <div className="status-pill">
                  {steamSync.counts.pricedItems} priced
                </div>
                <div className="status-pill">
                  {new Date(steamSync.fetchedAt).toLocaleTimeString("pl-PL")}
                </div>
              </div>
            ) : null}
          </div>

          {!sourceStatus?.connected ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/8 bg-white/4 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-primary">
                  <Link2 className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-foreground">Steam account required</p>
                  <p className="text-sm text-muted-foreground">
                    A Steam identity must be connected to import real inventory data. Once connected, this section can pull the user&apos;s public CS2 holdings directly from Steam.
                  </p>
                </div>
              </div>
            </div>
          ) : syncingSteam && !steamLoaded ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/8 bg-white/4 p-6 text-sm text-muted-foreground">
              Loading Steam inventory...
            </div>
          ) : !steamSync ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/8 bg-white/4 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-primary">
                  <DownloadCloud className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-foreground">No Steam inventory imported yet</p>
                  <p className="text-sm text-muted-foreground">
                    Use the sync action above to fetch live items from the connected Steam account and display them here.
                  </p>
                </div>
              </div>
            </div>
          ) : steamSync.items.length === 0 ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/8 bg-white/4 p-6 text-sm text-muted-foreground">
              Steam sync completed, but no CS2 items were returned for this account.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {steamSync.items.map((item) => (
                <article key={item.assetId} className="rounded-[1.6rem] border border-white/8 bg-white/4 p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.sellReason}</p>
                    </div>
                    <div
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getSteamSellBadge(item).className}`}
                    >
                      {getSteamSellBadge(item).label}
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <LocalSkinImage
                      name={item.marketHashName || item.name}
                      alt={item.name}
                      containerClassName="flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] border border-white/8 bg-background/60"
                      imageClassName="h-full w-full object-contain"
                      placeholderLabel="Skin"
                    />

                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="truncate text-sm text-muted-foreground">
                          {item.type || item.marketHashName || "Steam inventory item"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                          Qty {item.amount}
                        </span>
                        {item.rarity ? (
                          <span className="rounded-full border border-[#d5a65a]/25 bg-[#d5a65a]/10 px-3 py-1 text-xs text-[#f1c87a]">
                            {item.rarity}
                          </span>
                        ) : null}
                        {item.exterior ? (
                          <span className="rounded-full border border-white/10 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                            {item.exterior}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(() => {
                      const pricing = item.pricing ?? EMPTY_PRICING;

                      return (
                        <>
                    <div className="rounded-[1.2rem] border border-white/8 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Sell status</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {pricing.bestMarketplace || getSteamSellBadge(item).label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {pricing.bestPrice
                          ? `${formatCurrency(pricing.bestPrice)} highest price`
                          : item.sellReason}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/8 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Net after fee</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {pricing.bestNetPrice ? formatCurrency(pricing.bestNetPrice) : "No data"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {pricing.bestReference || item.sellReason}
                      </p>
                    </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(item.pricing?.markets ?? []).map((market) => (
                      <a
                        key={`${item.assetId}-${market.marketplace}`}
                        href={getMarketplaceHref(market.marketplace, item) || market.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className={`rounded-full border px-3 py-1 text-xs ${
                          market.marketplace === (item.pricing?.bestMarketplace ?? null)
                            ? "border-[#d5a65a]/25 bg-[#d5a65a]/10 text-[#f1c87a]"
                            : "border-white/10 bg-background/60 text-muted-foreground"
                        }`}
                      >
                        {market.marketplace} {formatCurrency(market.price)}
                      </a>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    {item.pricing?.bestMarketplace ? (
                      <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                        <a
                          href={
                            getMarketplaceHref(item.pricing.bestMarketplace, item) ||
                            item.pricing.markets.find(
                              (market) => market.marketplace === item.pricing?.bestMarketplace
                            )?.url ||
                            "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open {item.pricing.bestMarketplace}
                        </a>
                      </Button>
                    ) : (
                      <Button variant="secondary" className="rounded-full" disabled>
                        No marketplace link
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {error ? (
          <div className="surface-panel rounded-[1.8rem] border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="surface-panel rounded-[2rem] p-6 text-sm text-muted-foreground">
            Loading inventory workspace...
          </div>
        ) : computed.rows.length === 0 ? (
          <div className="surface-panel rounded-[2rem] p-8">
            <div className="mx-auto max-w-2xl space-y-4 text-center">
              <p className="section-heading">Inventory feed ready</p>
              <p className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
                No manual holdings to show
              </p>
              <p className="text-sm text-muted-foreground">
                Steam items are displayed above when available. This section covers only manually tracked positions, so it stays empty until you add custom entries.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  className="rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    document.getElementById("add-inventory-item")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  Add manual item
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2">
              <div className="surface-panel rounded-[1.9rem] p-6">
                <div className="space-y-1">
                  <div className="section-heading">Manual holdings value</div>
                  <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                    {formatCurrency(computed.totalValue)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Current value across manually tracked holdings.
                  </p>
                </div>
              </div>

              <div className="surface-panel rounded-[1.9rem] p-6">
                <div className="space-y-1">
                  <div className="section-heading">Manual sellable profit</div>
                  <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#f1c87a]">
                    {formatCurrency(computed.totalPotentialProfit)}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Total profit currently available across profitable manual positions.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <div className="section-heading">Manual holdings</div>
                <h3 className="text-xl font-semibold tracking-[-0.04em] text-foreground">
                  Custom positions and next actions
                </h3>
                <p className="text-sm text-muted-foreground">
                  These are manual overrides or fallback items outside the live Steam feed above.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {computed.rows.map((row) => {
                  const recommendation = getSellRecommendation(row);
                  const decision = getInventoryDecision(row);

                  return (
                    <article
                      key={row.id}
                      className="surface-panel rounded-[1.9rem] p-6"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="text-lg font-semibold tracking-[-0.03em] text-foreground">{row.skin}</h4>
                          <p className="text-sm text-muted-foreground">
                            Current value {formatCurrency(row.value)} | Qty {row.quantity}
                          </p>
                        </div>
                        <div
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${recommendation.className}`}
                        >
                          {recommendation.label}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Buy price
                          </div>
                          <div className="mt-2 text-lg font-semibold text-foreground">
                            {formatCurrency(row.purchasePrice)}
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
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

                        <div className="rounded-[1.5rem] border border-[#d5a65a]/20 bg-[#d5a65a]/6 p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Estimated profit
                          </div>
                          <div
                            className={`mt-2 text-lg font-semibold ${
                              row.profit >= 0 ? "text-[#f1c87a]" : "text-rose-300"
                            }`}
                          >
                            {formatCurrency(row.profit)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatPercent(row.roi, 1)} ROI
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 rounded-[1.6rem] border border-white/8 bg-white/4 p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            Recommended action
                          </p>
                          <p className="text-sm text-muted-foreground">{decision.helper}</p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          {decision.actionable ? (
                            <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                              <a href={SELL_MARKETPLACE_HREF} target="_blank" rel="noreferrer">
                                {decision.title}
                              </a>
                            </Button>
                          ) : (
                            <Button variant="secondary" className="rounded-full" disabled>
                              {decision.title}
                            </Button>
                          )}

                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full"
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
          </>
        )}

        <section id="add-inventory-item" className="surface-panel rounded-[2rem] p-6">
          <div className="space-y-2">
            <p className="section-heading">Manual fallback</p>
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">Manage items until Steam sync is connected</h3>
            <p className="text-sm text-muted-foreground">
              This section stays as a backup workflow and custom override for holdings that should not come directly from Steam.
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
                className="rounded-2xl border-white/10 bg-white/4"
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
                className="rounded-2xl border-white/10 bg-white/4"
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
                className="rounded-2xl border-white/10 bg-white/4"
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
                className="rounded-2xl border-white/10 bg-white/4"
                inputMode="numeric"
                placeholder="1"
              />
            </div>

            <div className="md:col-span-4">
              <Button type="submit" disabled={saving} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 md:w-auto">
                {saving ? "Saving..." : "Add item"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
