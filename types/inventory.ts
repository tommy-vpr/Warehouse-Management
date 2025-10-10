export interface UseInventoryListOptions {
  initialData?: InventoryResponse;
}

export interface InventoryItem {
  inventoryId: string;
  productVariantId: string;
  productName: string;
  sku: string;
  upc?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderPoint?: number;
  maxQuantity?: number;
  costPrice?: string;
  sellingPrice?: string;
  weight?: number;
  locations: {
    locationId: string;
    locationName: string;
    quantity: number;
    zone?: string;
    aisle?: string;
    shelf?: string;
  }[];
  lastCounted?: string;
  reorderStatus: "OK" | "LOW" | "CRITICAL" | "OVERSTOCK";
  category?: string;
  supplier?: string;
  updatedAt: string;
  hasReorderRequest: boolean;
}

export interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStock: number;
  outOfStock: number;
  overstock: number;
  recentTransactions: number;
}

export interface InventoryResponse {
  inventory: InventoryItem[];
  stats: InventoryStats;
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

// types/inventory.ts

// Existing imports...
export interface InventoryActionRequest {
  action: "ADJUST" | "REORDER";
  itemId: string;
  quantity?: number;
}

export interface AdjustActionResponse {
  success: true;
  message: string;
  newQuantity: number;
}

export interface ReorderActionResponse {
  success: true;
  message: string;
  suggestedQuantity: number;
}

export interface InventoryActionError {
  error: string;
}

export type InventoryActionResponse =
  | AdjustActionResponse
  | ReorderActionResponse
  | InventoryActionError;
