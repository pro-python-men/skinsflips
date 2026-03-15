import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import {
  listInventory,
  createInventoryItem,
  removeInventoryItem
} from "./inventory.service.js";

export const getInventory = asyncHandler(async (req, res) => {
  const items = await listInventory({ userId: req.user.id });
  res.json(items);
});

export const addInventory = asyncHandler(async (req, res) => {
  const { skin, purchasePrice, currentPrice, quantity } = req.body || {};
  const item = await createInventoryItem({
    userId: req.user.id,
    skin,
    purchasePrice,
    currentPrice,
    quantity
  });
  res.status(201).json(item);
});

export const deleteInventory = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await removeInventoryItem({ userId: req.user.id, id });
  res.status(204).send();
});

