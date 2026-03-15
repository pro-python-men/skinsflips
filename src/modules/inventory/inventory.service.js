import { ApiError } from "../../shared/errors/ApiError.js";
import {
  getInventoryByUserId,
  insertInventoryItem,
  deleteInventoryItemById
} from "./inventory.repository.js";

function asPositiveNumber(value, name) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw ApiError.badRequest(`${name} must be a positive number`);
  }
  return numberValue;
}

function asNonNegativeNumber(value, name) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw ApiError.badRequest(`${name} must be a non-negative number`);
  }
  return numberValue;
}

function asPositiveInteger(value, name) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw ApiError.badRequest(`${name} must be a positive integer`);
  }
  return numberValue;
}

export async function listInventory({ userId }) {
  const rows = await getInventoryByUserId(userId);
  return rows.map((row) => ({
    id: row.id,
    skin: row.skin,
    purchasePrice: Number(row.purchase_price),
    currentPrice: Number(row.current_price),
    quantity: Number(row.quantity),
    createdAt: row.created_at
  }));
}

export async function createInventoryItem({
  userId,
  skin,
  purchasePrice,
  currentPrice,
  quantity
}) {
  if (typeof skin !== "string" || !skin.trim()) {
    throw ApiError.badRequest("skin is required");
  }

  const purchase = asPositiveNumber(purchasePrice, "purchasePrice");
  const current = asNonNegativeNumber(currentPrice, "currentPrice");
  const qty = asPositiveInteger(quantity, "quantity");

  const row = await insertInventoryItem({
    userId,
    skin: skin.trim(),
    purchasePrice: purchase,
    currentPrice: current,
    quantity: qty
  });

  return {
    id: row.id,
    skin: row.skin,
    purchasePrice: Number(row.purchase_price),
    currentPrice: Number(row.current_price),
    quantity: Number(row.quantity),
    createdAt: row.created_at
  };
}

export async function removeInventoryItem({ userId, id }) {
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest("Invalid id");
  const deleted = await deleteInventoryItemById({ userId, id });
  if (!deleted) throw ApiError.notFound("Inventory item not found");
}

