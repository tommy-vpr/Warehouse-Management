export interface Location {
  id: string;
  name: string; // e.g. "1-A-2-B-2-X"

  // Enhanced warehouse fields
  warehouseNumber?: number | null;
  aisle?: string | null;
  bay?: number | null;
  tier?: string | null;
  space?: number | null;
  bin?: string | null;
  barcode?: string | null;

  // Legacy / zone-based data
  type: LocationType;
  zone?: string | null;
  shelf?: string | null;

  // Status flags
  isPickable: boolean;
  isReceivable: boolean;

  // Derived fields (for UI convenience)
  quantity?: number; // ← optional, often included when grouped in Inventory view

  // Optional relational / computed UI fields
  locationName?: string; // alias for `name`
  displayLabel?: string; // e.g. "WH1-A-03-B-2-X"

  createdAt: string;
  updatedAt: string;
}

/**
 * Matches your Prisma enum:
 * enum LocationType {
 *   RECEIVING
 *   STORAGE
 *   PICKING
 *   PACKING
 *   SHIPPING
 *   RETURNS
 *   GENERAL
 * }
 */
export type LocationType =
  | "RECEIVING"
  | "STORAGE"
  | "PICKING"
  | "PACKING"
  | "SHIPPING"
  | "RETURNS"
  | "GENERAL";
