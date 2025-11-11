// types/audit-trail.ts

export type AuditEventCategory =
  | "ORDER_STATUS"
  | "PICKING"
  | "PACKING"
  | "SHIPPING"
  | "BACK_ORDER"
  | "QUALITY_CHECK";

export interface AuditEvent {
  id: string;
  type: AuditEventCategory;
  eventType?: string;
  timestamp: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  metadata: {
    // Pick List metadata
    pickListId?: string;
    batchNumber?: string;
    itemId?: string;
    location?: string;
    scannedCode?: string;

    // Task metadata
    taskId?: string;
    taskNumber?: string;
    taskType?: string;

    // Shipping metadata - ✅ UPDATED/ADDED
    trackingNumber?: string;
    carrier?: string;
    service?: string; // Keep this for backward compatibility
    serviceLevel?: string; // ✅ Add this
    weight?: number; // ✅ Add this
    shippingCost?: string | number; // ✅ Add this
    insuranceAmount?: number; // ✅ Add this
    voidReason?: string; // ✅ Add this
    dimensions?: {
      // ✅ Add this
      length: number;
      width: number;
      height: number;
    };
    packageId?: string; // ✅ Add this
    manifestId?: string; // ✅ Add this
    pickupDate?: string; // ✅ Add this
    rateQuotes?: any; // ✅ Add this

    // Status change metadata
    fromStatus?: string;
    toStatus?: string;

    // Back order metadata
    quantity?: number;
    sku?: string;
    itemName?: string;
    reason?: string;
    status?: string;
    expectedDate?: string; // ✅ Add this for back orders

    // Reassignment metadata
    fromUserId?: string;
    fromUserName?: string;
    toUserId?: string;
    toUserName?: string;
    reassignmentReason?: string;

    // Progress tracking
    progress?: {
      completedItems?: number;
      totalItems?: number;
      completedOrders?: number;
      totalOrders?: number;
    };
  };
  data?: Record<string, any>;
  notes?: string | null;
}

export interface AuditSummary {
  totalEvents: number;
  byCategory: {
    orderStatus: number;
    picking: number;
    packing: number;
    shipping: number;
    backOrders: number;
    qualityCheck: number;
  };
  byEventType: Record<string, number>;
  timeline: {
    firstEvent: Date | null;
    lastEvent: Date | null;
    durationMs: number | null;
  };
}

export interface AuditTrailResponse {
  timeline: AuditEvent[];
  summary: AuditSummary;
}

// Reassignment types
export type ReassignmentReason =
  | "STAFF_UNAVAILABLE"
  | "SHIFT_CHANGE"
  | "WORKLOAD_BALANCE"
  | "EMERGENCY"
  | "SKILL_MISMATCH"
  | "EQUIPMENT_ISSUE"
  | "PERFORMANCE_ISSUE"
  | "OTHER";

export interface ReassignmentRequest {
  newAssignedTo: string;
  reason: ReassignmentReason;
  notes?: string;
}

export interface ReassignmentResponse {
  success: boolean;
  pickList?: {
    id: string;
    batchNumber: string;
    assignedTo: string;
    assignedToUser: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  };
  task?: {
    id: string;
    taskNumber: string;
    type: string;
    assignedTo: string | null;
    assignedUser: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    progress: {
      completedItems: number;
      totalItems: number;
      completedOrders: number;
      totalOrders: number;
    };
  };
  event: {
    id: string;
    eventType: string;
    fromUser: string | null;
    toUser: string | null;
    timestamp: string;
  };
}
