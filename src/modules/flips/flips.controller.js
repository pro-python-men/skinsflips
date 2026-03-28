import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import { listFlips, addFlip } from "./flips.service.js";

export const getFlips = asyncHandler(async (req, res) => {
  const flips = await listFlips({ userId: req.user.id });

  const formattedFlips = flips.map((flip) => {
    const buyPrice = Number(flip.buy_price);
    const sellPrice = Number(flip.sell_price);
    const profit = Number(flip.profit);
    const roi = Number(flip.roi);

    return {
      id: flip.id,
      skin: flip.skin,
      buyPrice,
      sellPrice,
      profit,
      roi,
      createdAt: flip.created_at
    };
  });

  res.json(formattedFlips);
});

export const createFlip = asyncHandler(async (req, res) => {
  const { skin, buyPrice, sellPrice } = req.body || {};

  const flip = await addFlip({
    userId: req.user.id,
    skin,
    buyPrice,
    sellPrice
  });

  res.status(201).json({
    id: flip.id,
    skin: flip.skin,
    buyPrice: Number(flip.buy_price),
    sellPrice: Number(flip.sell_price),
    profit: Number(flip.profit),
    roi: Number(flip.roi),
    createdAt: flip.created_at
  });
});
export const getBestFlips = asyncHandler(async (req, res) => {
  const items = [
    { skin: "AK-47 | Redline (FT)", buyPrice: 42.5, sellPrice: 49.9, source: "buff163" },
    { skin: "AWP | Asiimov (BS)", buyPrice: 78.0, sellPrice: 88.0, source: "steam" },
    { skin: "M4A1-S | Printstream (FT)", buyPrice: 120.0, sellPrice: 134.5, source: "skinport" }
  ];

  const normalized = items.map((it, idx) => {
    const buyPrice = Number(it.buyPrice);
    const sellPrice = Number(it.sellPrice);
    const profit = sellPrice - buyPrice;
    const roi = buyPrice > 0 ? (profit / buyPrice) * 100 : 0;

    return {
      id: String(idx + 1),
      skin: String(it.skin),
      buyPrice,
      sellPrice,
      profit,
      roi,
      source: String(it.source)
    };
  });

  res.json(normalized);
});
