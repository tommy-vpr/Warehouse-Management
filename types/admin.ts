// types/admin.ts

export interface PickListItem {
  id: string;
  pickListId: string;
  orderId: string;
  order?: {
    orderNumber: string;
  };
  productVariantId: string;
  locationId: string;
  quantityToPick: number;
  quantityPicked: number;
  status: string;
}

export interface PickListForAdmin {
  id: string;
  batchNumber: string;
  status:
    | "PENDING"
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "PAUSED"
    | "COMPLETED"
    | "CANCELLED";
  assignedTo: string | null;
  totalItems: number;
  pickedItems: number;
  items?: PickListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffWorkload {
  activeLists: number;
  remainingItems: number;
  pickLists: PickListForAdmin[];
}

export interface StaffMemberWithWorkload {
  id: string;
  name: string | null;
  email: string;
  role: string;
  activeLists: number;
  remainingItems: number;
  pickLists: PickListForAdmin[];
}

export interface ReassignmentEventData {
  fromUserName?: string;
  toUserName?: string;
  reason?: string;
  progress?: {
    completedItems: number;
    totalItems: number;
  };
}

export interface ReassignmentEvent {
  id: string;
  pickListId: string;
  eventType: string;
  userId: string;
  fromUserId?: string;
  toUserId?: string;
  notes?: string;
  data?: ReassignmentEventData;
  createdAt: string;
  pickList?: {
    batchNumber: string;
  };
}

export interface ReassignmentRequest {
  pickListIds: string[];
  toUserId: string;
  reason: string;
  notes?: string;
  strategy: "split" | "simple";
}
