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
