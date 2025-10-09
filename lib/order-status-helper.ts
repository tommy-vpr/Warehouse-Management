// lib/order-status-helper.ts
import { prisma } from "@/lib/prisma";
import { OrderStatus, Prisma } from "@prisma/client";

/**
 * Updates order status and creates a status history entry
 * Can be used standalone or within an existing transaction
 */
export async function updateOrderStatus({
  orderId,
  newStatus,
  userId,
  notes,
  tx, // Optional transaction client
}: {
  orderId: string;
  newStatus: OrderStatus;
  userId: string;
  notes?: string;
  tx?: Prisma.TransactionClient;
}) {
  const db = tx || prisma;

  // Get current order status
  const currentOrder = await db.order.findUnique({
    where: { id: orderId },
    select: { status: true, orderNumber: true },
  });

  if (!currentOrder) {
    throw new Error(`Order ${orderId} not found`);
  }

  const previousStatus = currentOrder.status;

  // Even if status hasn't changed, log it if there are notes
  const shouldLog = previousStatus !== newStatus || notes;

  if (!shouldLog) {
    return currentOrder;
  }

  // Update order and create history
  if (tx) {
    // If we're in a transaction, just execute directly
    await db.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    await db.orderStatusHistory.create({
      data: {
        orderId,
        previousStatus,
        newStatus,
        changedBy: userId,
        changedAt: new Date(),
        notes,
      },
    });

    return currentOrder;
  } else {
    // Otherwise wrap in our own transaction
    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus,
          newStatus,
          changedBy: userId,
          changedAt: new Date(),
          notes,
        },
      }),
    ]);

    return updatedOrder;
  }
}

/**
 * Log a status event without changing status (for tracking within same status)
 */
export async function logOrderEvent({
  orderId,
  userId,
  notes,
  tx,
}: {
  orderId: string;
  userId: string;
  notes: string;
  tx?: Prisma.TransactionClient;
}) {
  const db = tx || prisma;

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  await db.orderStatusHistory.create({
    data: {
      orderId,
      previousStatus: order.status,
      newStatus: order.status,
      changedBy: userId,
      changedAt: new Date(),
      notes,
    },
  });
}

/**
 * Batch update multiple orders and create status history
 */
export async function batchUpdateOrderStatus({
  orderIds,
  newStatus,
  userId,
  notes,
}: {
  orderIds: string[];
  newStatus: OrderStatus;
  userId: string;
  notes?: string;
}) {
  // Get all orders with their current statuses
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, status: true },
  });

  // Filter out orders that are already in the target status
  const ordersToUpdate = orders.filter((order) => order.status !== newStatus);

  if (ordersToUpdate.length === 0) {
    return { updated: 0, skipped: orders.length };
  }

  // Update orders and create history entries
  await prisma.$transaction([
    // Update all orders
    prisma.order.updateMany({
      where: { id: { in: ordersToUpdate.map((o) => o.id) } },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    }),
    // Create history entries for each order
    prisma.orderStatusHistory.createMany({
      data: ordersToUpdate.map((order) => ({
        orderId: order.id,
        previousStatus: order.status,
        newStatus,
        changedBy: userId,
        changedAt: new Date(),
        notes,
      })),
    }),
  ]);

  return {
    updated: ordersToUpdate.length,
    skipped: orders.length - ordersToUpdate.length,
  };
}

/**
 * Add a note to the most recent status change
 */
export async function addStatusNote({
  orderId,
  userId,
  note,
}: {
  orderId: string;
  userId: string;
  note: string;
}) {
  // Get the most recent status history entry
  const latestHistory = await prisma.orderStatusHistory.findFirst({
    where: { orderId },
    orderBy: { changedAt: "desc" },
  });

  if (!latestHistory) {
    throw new Error("No status history found for this order");
  }

  // Update the note
  return prisma.orderStatusHistory.update({
    where: { id: latestHistory.id },
    data: { notes: note },
  });
}
