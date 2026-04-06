import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import {
  listFlips,
  addFlip,
  listTrackedFlips,
  trackFlip,
  completeFlip,
  getBestFlipsReal
} from "./flips.service.js";


function formatTrackedFlip(flip) {
  const buyPrice = Number(flip.buy_price);
  const sellPriceExpected = Number(flip.sell_price_expected);
  const sellPriceActual =
    flip.sell_price_actual === null || flip.sell_price_actual === undefined
      ? null
      : Number(flip.sell_price_actual);
  const profitExpected = Number(flip.profit_expected);
  const profitActual =
    flip.profit_actual === null || flip.profit_actual === undefined
      ? null
      : Number(flip.profit_actual);

  const roiExpected = buyPrice > 0 ? (profitExpected / buyPrice) * 100 : 0;
  const roiActual = buyPrice > 0 && profitActual !== null ? (profitActual / buyPrice) * 100 : null;

  return {
    id: flip.id,
    skinName: flip.skin_name,
    buyPrice,
    sellPriceExpected,
    sellPriceActual,
    profitExpected,
    profitActual,
    sourceBuy: flip.source_buy,
    sourceSell: flip.source_sell,
    status: flip.status,
    roiExpected,
    roiActual,
    createdAt: flip.created_at,
    completedAt: flip.completed_at
  };
}

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

export const getMyTrackedFlips = asyncHandler(async (req, res) => {
  const flips = await listTrackedFlips({ userId: req.user.id });
  res.json(flips.map(formatTrackedFlip));
});

export const createTrackedFlip = asyncHandler(async (req, res) => {
  const { skinName, buyPrice, sellPriceExpected, sourceBuy, sourceSell } = req.body || {};

  const flip = await trackFlip({
    userId: req.user.id,
    skinName,
    buyPrice,
    sellPriceExpected,
    sourceBuy,
    sourceSell
  });

  res.status(201).json(formatTrackedFlip(flip));
});

export const markFlipAsCompleted = asyncHandler(async (req, res) => {
  const { sellPriceActual } = req.body || {};

  const flip = await completeFlip({
    userId: req.user.id,
    id: req.params.id,
    sellPriceActual
  });

  res.json(formatTrackedFlip(flip));
});

export const getBestFlips = asyncHandler(async (_req, res) => {
  const data = await getBestFlipsReal();
  res.json(data);
});

