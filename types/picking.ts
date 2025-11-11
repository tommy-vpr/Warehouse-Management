// types/picking.ts

export interface OrderForPicking {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  createdAt: string;
  pickingAssignedTo: string | null;
  items: Array<{
    id: string;
    productVariantId: string;
    quantity: number;
  }>;
}

export interface StaffWorkload {
  activePickLists: number;
  remainingItems: number;
  status: "idle" | "light" | "moderate" | "heavy";
}

export interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  workload?: StaffWorkload;
}

export interface CreatePickListRequest {
  orderIds: string[];
  assignedTo: string;
  priority: number;
}

export interface CreatePickListResponse {
  id: string;
  batchNumber: string;
  status: string;
  assignedTo: string | null;
  totalItems: number;
  createdAt: string;
}
