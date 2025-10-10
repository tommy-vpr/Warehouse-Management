// /types/order.ts

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

export interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface NextAction {
  action: string;
  label: string;
  variant: "default" | "outline" | "destructive";
}

export interface StatusHistoryEntry {
  id: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  changedAt: string;
  notes?: string;
}

export interface BackOrder {
  id: string;
  productVariantId: string;
  productName: string;
  sku: string;
  quantityBackOrdered: number;
  quantityFulfilled: number;
  status: string;
  reason: string;
  createdAt: string;
}

export interface OrderDetailResponse {
  id: string;
  orderNumber: string;
  shopifyOrderId?: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  totalAmount: string;
  itemCount: number;
  totalWeight: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  shippingAddress: {
    name: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  };
  billingAddress?: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
  shippingCarrier?: string;
  shippingService?: string;
  shippingCost?: string;
  labelUrl?: string;
  notes?: string;
  pickListInfo?: {
    pickListId: string;
    batchNumber: string;
    pickStatus: string;
    assignedTo?: string;
    startTime?: string;
  };
  items: OrderItem[];
  nextActions: NextAction[];
  statusHistory: StatusHistoryEntry[];
  backOrders: BackOrder[];
}
