// lib/audit-helper.ts
import { prisma } from "@/lib/prisma";

/**
 * Track order reassignment events
 */
export async function trackOrderReassignment(params: {
  orderId: string;
  fromUserId: string | null;
  toUserId: string;
  stage: "PICKING" | "PACKING" | "SHIPPING";
  userId: string; // Who made the reassignment
  notes?: string;
}) {
  const { orderId, fromUserId, toUserId, stage, userId, notes } = params;

  const fromUser = fromUserId
    ? await prisma.user.findUnique({ where: { id: fromUserId } })
    : null;
  const toUser = await prisma.user.findUnique({ where: { id: toUserId } });

  const statusNote = `${stage} reassigned from ${
    fromUser?.name || "Unassigned"
  } to ${toUser?.name || toUserId}${notes ? ` - ${notes}` : ""}`;

  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: stage,
      toStatus: stage,
      notes: statusNote,
      userId,
    },
  });
}

/**
 * Track pick list wave changes
 */
export async function trackPickListWaveChange(params: {
  orderId: string;
  fromBatchNumber: string | null;
  toBatchNumber: string;
  userId: string;
  notes?: string;
}) {
  const { orderId, fromBatchNumber, toBatchNumber, userId, notes } = params;

  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: "PICKING",
      toStatus: "PICKING",
      notes: `Pick list wave changed from ${
        fromBatchNumber || "None"
      } to ${toBatchNumber}${notes ? ` - ${notes}` : ""}`,
      userId,
    },
  });
}

/**
 * Track packing task changes
 */
export async function trackPackingTaskChange(params: {
  orderId: string;
  fromTaskNumber: string | null;
  toTaskNumber: string;
  userId: string;
  notes?: string;
}) {
  const { orderId, fromTaskNumber, toTaskNumber, userId, notes } = params;

  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: "PACKING",
      toStatus: "PACKING",
      notes: `Packing task changed from ${
        fromTaskNumber || "None"
      } to ${toTaskNumber}${notes ? ` - ${notes}` : ""}`,
      userId,
    },
  });
}

/**
 * Track priority changes
 */
export async function trackPriorityChange(params: {
  orderId: string;
  fromPriority: string;
  toPriority: string;
  userId: string;
  notes?: string;
}) {
  const { orderId, fromPriority, toPriority, userId, notes } = params;

  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: "PRIORITY_CHANGE",
      toStatus: "PRIORITY_CHANGE",
      notes: `Priority changed from ${fromPriority} to ${toPriority}${
        notes ? ` - ${notes}` : ""
      }`,
      userId,
    },
  });
}

/**
 * Track manual adjustments
 */
export async function trackManualAdjustment(params: {
  orderId: string;
  action: string;
  description: string;
  userId: string;
}) {
  const { orderId, action, description, userId } = params;

  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: "MANUAL_ADJUSTMENT",
      toStatus: "MANUAL_ADJUSTMENT",
      notes: `${action}: ${description}`,
      userId,
    },
  });
}

/**
 * Track order notes/comments
 */
export async function trackOrderComment(params: {
  orderId: string;
  comment: string;
  userId: string;
}) {
  const { orderId, comment, userId } = params;

  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: "COMMENT",
      toStatus: "COMMENT",
      notes: comment,
      userId,
    },
  });
}
