// types/orders.ts - Generated from your Prisma schema

import { Decimal } from "@prisma/client/runtime/library";

// Enums
export enum OrderStatus {
  PENDING = "PENDING",
  ALLOCATED = "ALLOCATED",
  PICKING = "PICKING",
  PICKED = "PICKED",
  PACKED = "PACKED",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  RETURNED = "RETURNED",
  FULFILLED = "FULFILLED",
}

export enum UserRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
  READONLY = "READONLY",
}

export enum LocationType {
  RECEIVING = "RECEIVING",
  STORAGE = "STORAGE",
  PICKING = "PICKING",
  PACKING = "PACKING",
  SHIPPING = "SHIPPING",
  RETURNS = "RETURNS",
  GENERAL = "GENERAL",
}

export enum TransactionType {
  ADJUSTMENT = "ADJUSTMENT",
  RECEIPT = "RECEIPT",
  SALE = "SALE",
  TRANSFER = "TRANSFER",
  COUNT = "COUNT",
  ALLOCATION = "ALLOCATION",
  DEALLOCATION = "DEALLOCATION",
}

// Base Types
export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  shopifyProductId: string | null;
  brand: string | null;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  upc: string | null;
  name: string;
  costPrice: Decimal | null;
  sellingPrice: Decimal | null;
  weight: Decimal | null;
  dimensions: any | null; // JSON field
  shopifyVariantId: string | null;
  category: string | null;
  supplier: string | null;
  barcode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  zone: string | null;
  aisle: string | null;
  shelf: string | null;
  bin: string | null;
  isPickable: boolean;
  isReceivable: boolean;
  barcode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inventory {
  id: string;
  productVariantId: string;
  locationId: string;
  quantityOnHand: number;
  quantityReserved: number;
  reorderPoint: number | null;
  maxQuantity: number | null;
  lastCounted: Date | null;
  updatedAt: Date;
}

// Order Types
export interface OrderItem {
  id: string;
  orderId: string;
  productVariantId: string;
  quantity: number;
  unitPrice: Decimal;
  totalPrice: Decimal;
}

export interface ShippingPackage {
  id: string;
  orderId: string;
  carrierCode: string;
  serviceCode: string;
  packageCode: string;
  trackingNumber: string;
  labelUrl: string | null;
  cost: Decimal;
  currency: string;
  weight: Decimal;
  dimensions: any; // JSON field
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  changedBy: string;
  changedAt: Date;
  notes: string | null;
}

export interface Order {
  id: string;
  shopifyOrderId: string | null;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  status: OrderStatus;
  totalAmount: Decimal;
  shippingAddress: any; // JSON field
  billingAddress: any | null; // JSON field
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: Date | null;
  shippingStatus: string | null;
  shippingCost: string | null;
  shippingCarrier: string | null;
  shippingService: string | null;
  labelUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Relation Types (with includes)
export interface OrderWithItems extends Order {
  items: (OrderItem & {
    productVariant: ProductVariant & {
      product: Product;
    };
  })[];
}

export interface OrderWithPackages extends Order {
  packages: ShippingPackage[];
}

export interface OrderWithHistory extends Order {
  statusHistory: (OrderStatusHistory & {
    changedByUser: User;
  })[];
}

export interface OrderWithFullDetails extends Order {
  items: (OrderItem & {
    productVariant: ProductVariant & {
      product: Product;
    };
  })[];
  packages: ShippingPackage[];
  statusHistory: (OrderStatusHistory & {
    changedByUser: User;
  })[];
}

// Pick List Types (assuming you have these models)
export interface PickList {
  id: string;
  batchNumber: string;
  status: string;
  assignedUserId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PickListItem {
  id: string;
  pickListId: string;
  orderId: string;
  productVariantId: string;
  locationId: string;
  quantityRequested: number;
  quantityPicked: number | null;
  status: string;
  pickedBy: string | null;
  pickedAt: Date | null;
  notes: string | null;
}

export interface PickEvent {
  id: string;
  pickListItemId: string;
  userId: string;
  eventType: string;
  quantity: number;
  timestamp: Date;
  notes: string | null;
}

// Address Types (for JSON fields)
export interface ShippingAddress {
  name?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  province_code: string;
  zip: string;
  country?: string;
  country_code?: string;
  phone?: string;
}

export interface BillingAddress extends ShippingAddress {
  // Same structure as shipping address
}

// Management Dashboard Types
export interface NextAction {
  action: string;
  label: string;
  variant: "default" | "outline" | "destructive";
}

export interface ManagementOrder {
  id: string;
  orderNumber: string;
  shopifyOrderId?: string;
  customerName: string;
  customerEmail: string | null;
  status: OrderStatus;
  totalAmount: string; // Converted from Decimal for display
  itemCount: number;
  totalWeight: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  createdAt: string; // ISO string for frontend
  updatedAt: string; // ISO string for frontend
  shippingLocation: {
    city: string;
    state: string;
    country: string;
  };
  pickListInfo?: {
    pickListId: string;
    batchNumber: string;
    pickStatus: string;
    assignedTo?: string;
    startTime?: string;
  };
  nextActions: NextAction[];
  items: ManagementOrderItem[];
}

export interface ManagementOrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string; // Converted from Decimal
  totalPrice: string; // Converted from Decimal
  weight?: number;
  dimensions?: any;
}

export interface OrderStats {
  total: number;
  pending: number;
  allocated: number;
  picking: number;
  picked: number;
  packed: number;
  shipped: number;
  fulfilled: number;
  delivered: number;
  cancelled: number;
  returned: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

// API Response Types
export interface OrdersResponse {
  orders: ManagementOrder[];
  stats: OrderStats;
}

export interface OrderActionRequest {
  action: string;
  orderId?: string;
  orderIds?: string[];
}

// Shipping Integration Types
export interface ShipmentItem {
  itemId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  weight?: number;
}

export interface Shipment {
  id: string;
  name: string;
  items: ShipmentItem[];
  shippingConfig: {
    carrierId: string;
    serviceCode: string;
    packageCode: string;
    weight: string;
    dimensions: {
      length: string;
      width: string;
      height: string;
    };
  };
  notes: string;
}

export interface CompletedShipment {
  splitName: string;
  trackingNumber: string;
  labelUrl: string;
  cost: string;
  carrier: string;
  items: ShipmentItem[];
}

export interface Carrier {
  carrier_id: string;
  carrier_code: string;
  friendly_name: string;
  services: Array<{
    service_code: string;
    name: string;
  }>;
  packages: Array<{
    package_code: string;
    name: string;
  }>;
}

// Inventory Transaction Types
export interface InventoryTransaction {
  id: string;
  productVariantId: string;
  locationId: string | null;
  transactionType: TransactionType;
  quantityChange: number;
  referenceId: string | null;
  referenceType: string | null;
  userId: string | null;
  notes: string | null;
  createdAt: Date;
}

// Utility Types
export type OrderStatusTransition = {
  from: OrderStatus;
  to: OrderStatus;
  allowedRoles: UserRole[];
  requiresConfirmation?: boolean;
};

export type OrderFilters = {
  status?: OrderStatus | "ALL";
  search?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "ALL";
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
};

// Form Types
export type CreateOrderRequest = {
  shopifyOrderId?: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  billingAddress?: BillingAddress;
  items: Array<{
    productVariantId: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export type UpdateOrderRequest = Partial<{
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  billingAddress: BillingAddress;
  trackingNumber: string;
  trackingUrl: string;
  shippingCost: string;
  shippingCarrier: string;
  shippingService: string;
  labelUrl: string;
  notes: string;
}>;

// Type Guards
export const isOrderStatus = (value: string): value is OrderStatus => {
  return Object.values(OrderStatus).includes(value as OrderStatus);
};

export const isUserRole = (value: string): value is UserRole => {
  return Object.values(UserRole).includes(value as UserRole);
};

export const isTransactionType = (value: string): value is TransactionType => {
  return Object.values(TransactionType).includes(value as TransactionType);
};
