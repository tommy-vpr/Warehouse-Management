// types/returns.ts
// TypeScript types for Return Management System

import { Prisma } from "@prisma/client";

// ============================================================================
// ENUMS (mirroring Prisma enums)
// ============================================================================

export enum ReturnStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  IN_TRANSIT = "IN_TRANSIT",
  RECEIVED = "RECEIVED",
  INSPECTING = "INSPECTING",
  INSPECTION_COMPLETE = "INSPECTION_COMPLETE",
  RESTOCKING = "RESTOCKING",
  REFUND_PENDING = "REFUND_PENDING",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED",
}

export enum ReturnReason {
  DEFECTIVE = "DEFECTIVE",
  WRONG_ITEM = "WRONG_ITEM",
  NOT_AS_DESCRIBED = "NOT_AS_DESCRIBED",
  NO_LONGER_NEEDED = "NO_LONGER_NEEDED",
  ORDERED_BY_MISTAKE = "ORDERED_BY_MISTAKE",
  BETTER_PRICE = "BETTER_PRICE",
  DAMAGED_SHIPPING = "DAMAGED_SHIPPING",
  EXPIRED = "EXPIRED",
  OTHER = "OTHER",
}

export enum ReturnCondition {
  NEW_UNOPENED = "NEW_UNOPENED",
  NEW_OPENED = "NEW_OPENED",
  LIKE_NEW = "LIKE_NEW",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
  DEFECTIVE = "DEFECTIVE",
  DAMAGED = "DAMAGED",
  EXPIRED = "EXPIRED",
  MISSING_PARTS = "MISSING_PARTS",
}

export enum ReturnDisposition {
  RESTOCK = "RESTOCK",
  DISPOSE = "DISPOSE",
  REPAIR = "REPAIR",
  VENDOR_RETURN = "VENDOR_RETURN",
  DONATE = "DONATE",
  QUARANTINE = "QUARANTINE",
  LIQUIDATE = "LIQUIDATE",
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = "ORIGINAL_PAYMENT",
  STORE_CREDIT = "STORE_CREDIT",
  REPLACEMENT = "REPLACEMENT",
  NO_REFUND = "NO_REFUND",
}

export enum RefundStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  PARTIAL = "PARTIAL",
  CANCELLED = "CANCELLED",
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

// 1. Order Lookup
export interface OrderLookupRequest {
  orderNumber: string;
  customerEmail: string;
}

export interface OrderLookupResponse {
  success: boolean;
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    shippedAt: Date | null;
    items: {
      id: string;
      productVariantId: string;
      sku: string;
      name: string;
      quantity: number;
      quantityReturned: number; // from existing returns
      quantityAvailable: number; // available to return
      unitPrice: number;
      imageUrl?: string;
    }[];
  } | null;
  error?: string;
  eligibility: {
    isEligible: boolean;
    reason?: string;
    daysRemaining?: number;
  };
}

// 2. Create Return
export interface CreateReturnRequest {
  orderId: string;
  customerEmail: string; // for verification
  reason: ReturnReason;
  reasonDetails?: string;
  refundMethod: RefundMethod;
  items: {
    productVariantId: string;
    quantityRequested: number;
  }[];
}

export interface CreateReturnResponse {
  success: boolean;
  returnOrder: {
    id: string;
    rmaNumber: string;
    status: ReturnStatus;
    approvalRequired: boolean;
  } | null;
  error?: string;
}

// 3. Inspection
export interface InspectItemRequest {
  returnItemId: string;
  quantityReceived: number;
  condition: ReturnCondition;
  conditionNotes?: string;
  disposition: ReturnDisposition;
  dispositionNotes?: string;
  restockLocationId?: string;
  photoUrls?: string[];
}

export interface InspectionSummary {
  returnOrderId: string;
  totalItemsExpected: number;
  totalItemsInspected: number;
  totalQuantityReceived: number;
  totalRestockable: number;
  totalDisposed: number;
  estimatedRefund: number;
  restockingFee: number;
  inspections: {
    returnItemId: string;
    sku: string;
    productName: string;
    quantityReceived: number;
    quantityRestockable: number;
    quantityDisposed: number;
    condition: ReturnCondition;
    disposition: ReturnDisposition;
    refundAmount: number;
  }[];
}

// 4. Refund Processing
export interface ProcessRefundRequest {
  returnOrderId: string;
  adjustments?: {
    description: string;
    amount: number; // positive or negative
  }[];
  notes?: string;
}

export interface RefundCalculation {
  itemRefunds: {
    returnItemId: string;
    sku: string;
    baseAmount: number;
    conditionDeduction: number;
    finalAmount: number;
  }[];
  subtotal: number;
  restockingFee: number;
  adjustments: number;
  shippingRefund: number;
  finalRefundAmount: number;
}

// ============================================================================
// PRISMA INCLUDES
// ============================================================================

export const returnOrderIncludes = {
  basic: {
    order: {
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        shippedAt: true,
      },
    },
    items: {
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
      },
    },
  },
  detailed: {
    order: {
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    },
    items: {
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
        inspections: {
          include: {
            inspector: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            location: true,
          },
        },
      },
    },
    events: {
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc" as const,
      },
    },
    receivedByUser: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    inspectedByUser: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    approvedByUser: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ReturnOrderWithDetails = Prisma.ReturnOrderGetPayload<{
  include: typeof returnOrderIncludes.detailed;
}>;

export type ReturnItemWithVariant = Prisma.ReturnItemGetPayload<{
  include: {
    productVariant: {
      include: {
        product: true;
      };
    };
  };
}>;

// ============================================================================
// BUSINESS LOGIC TYPES
// ============================================================================

export interface ReturnEligibility {
  isEligible: boolean;
  reason?: string;
  daysRemaining?: number;
  returnWindow: number; // days
  shippedDate: Date | null;
}

export interface ReturnPolicyConfig {
  returnWindowDays: number;
  autoApproveThreshold: number; // dollar amount
  restockingFeePercent: number;
  allowedStatuses: string[];
  conditionRefundRates: Record<ReturnCondition, number>;
  autoDispositionRules: boolean;
}

export const DEFAULT_RETURN_POLICY: ReturnPolicyConfig = {
  returnWindowDays: 30,
  autoApproveThreshold: 500,
  restockingFeePercent: 15,
  allowedStatuses: ["SHIPPED", "DELIVERED"],
  conditionRefundRates: {
    [ReturnCondition.NEW_UNOPENED]: 1.0,
    [ReturnCondition.NEW_OPENED]: 0.85,
    [ReturnCondition.LIKE_NEW]: 0.85,
    [ReturnCondition.GOOD]: 0.75,
    [ReturnCondition.FAIR]: 0.5,
    [ReturnCondition.POOR]: 0.5,
    [ReturnCondition.DEFECTIVE]: 1.0,
    [ReturnCondition.DAMAGED]: 1.0,
    [ReturnCondition.EXPIRED]: 1.0,
    [ReturnCondition.MISSING_PARTS]: 0.5,
  },
  autoDispositionRules: true,
};

// ============================================================================
// DASHBOARD/ANALYTICS TYPES
// ============================================================================

export interface ReturnMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totals: {
    returnCount: number;
    returnRate: number; // percentage
    totalRefundAmount: number;
    averageRefundAmount: number;
    averageProcessingDays: number;
  };
  byReason: {
    reason: ReturnReason;
    count: number;
    percentage: number;
  }[];
  byCondition: {
    condition: ReturnCondition;
    count: number;
    percentage: number;
  }[];
  byDisposition: {
    disposition: ReturnDisposition;
    count: number;
    percentage: number;
  }[];
  topReturnedProducts: {
    sku: string;
    productName: string;
    returnCount: number;
    totalQuantity: number;
    primaryReason: ReturnReason;
  }[];
  restockingMetrics: {
    totalReceived: number;
    totalRestocked: number;
    totalDisposed: number;
    restockRate: number; // percentage
  };
}

export interface ReturnStatusCounts {
  [ReturnStatus.PENDING]: number;
  [ReturnStatus.APPROVED]: number;
  [ReturnStatus.REJECTED]: number;
  [ReturnStatus.IN_TRANSIT]: number;
  [ReturnStatus.RECEIVED]: number;
  [ReturnStatus.INSPECTING]: number;
  [ReturnStatus.INSPECTION_COMPLETE]: number;
  [ReturnStatus.RESTOCKING]: number;
  [ReturnStatus.REFUND_PENDING]: number;
  [ReturnStatus.REFUNDED]: number;
  [ReturnStatus.PARTIALLY_REFUNDED]: number;
  [ReturnStatus.CLOSED]: number;
  [ReturnStatus.CANCELLED]: number;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface ReturnNotification {
  type:
    | "RMA_CREATED"
    | "RMA_APPROVED"
    | "RMA_REJECTED"
    | "PACKAGE_RECEIVED"
    | "INSPECTION_COMPLETE"
    | "REFUND_PROCESSED"
    | "HIGH_VALUE_RETURN"
    | "DEFECT_PATTERN_DETECTED";
  returnOrderId: string;
  rmaNumber: string;
  recipientEmail?: string;
  recipientUserId?: string;
  data: Record<string, any>;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
}

// ============================================================================
// VALIDATION SCHEMAS (for Zod)
// ============================================================================

export const CreateReturnSchema = {
  orderId: "string",
  customerEmail: "email",
  reason: "enum:ReturnReason",
  items: "array",
  // etc...
};
