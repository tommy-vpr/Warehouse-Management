// lib/reserveInventory.ts
import { prisma } from "@/lib/prisma";

// ✅ ADD: Export the interface so it can be used in other files
export interface ReservationResult {
  success: boolean;
  order: any;
  reservations: any[];
  insufficientItems?: InsufficientInventoryItem[];
}

export interface InsufficientInventoryItem {
  sku: string;
  productName: string;
  productVariantId: string;
  locationId: string;
  locationName: string;
  requested: number;
  available: number;
  shortage: number;
}

export async function reserveOrderInventory({
  orderId,
  userId,
  handleInsufficientInventory = "throw", // 'throw' | 'backorder' | 'count'
  notes,
}: {
  orderId: string;
  userId: string;
  handleInsufficientInventory?: "throw" | "backorder" | "count";
  notes?: string;
}): Promise<ReservationResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          productVariant: {
            include: {
              inventory: {
                include: {
                  location: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) throw new Error("Order not found");
  if (order.status !== "PENDING") {
    throw new Error("Order must be in PENDING status to reserve inventory");
  }

  // First pass: check for insufficient inventory
  const insufficientItems: InsufficientInventoryItem[] = [];

  for (const item of order.items) {
    let remaining = item.quantity;

    const inventoryLocations = item.productVariant.inventory
      .map((inv) => ({
        ...inv,
        quantityAvailable: inv.quantityOnHand - inv.quantityReserved,
      }))
      .filter((inv) => inv.quantityAvailable > 0)
      .sort((a, b) => b.quantityAvailable - a.quantityAvailable);

    // Calculate total available
    const totalAvailable = inventoryLocations.reduce(
      (sum, inv) => sum + inv.quantityAvailable,
      0
    );

    if (totalAvailable < remaining) {
      // Find the primary location (with most stock)
      const primaryLocation = inventoryLocations[0] || {
        locationId: item.productVariant.inventory[0]?.locationId,
        location: { name: item.productVariant.inventory[0]?.location.name },
        quantityAvailable: 0,
      };

      insufficientItems.push({
        sku: item.productVariant.sku,
        productName: item.productVariant.name,
        productVariantId: item.productVariantId,
        locationId: primaryLocation.locationId,
        locationName: primaryLocation.location.name,
        requested: item.quantity,
        available: totalAvailable,
        shortage: remaining - totalAvailable,
      });
    }
  }

  // If there are insufficient items, handle based on strategy
  if (insufficientItems.length > 0) {
    if (handleInsufficientInventory === "throw") {
      // Return error with details for UI to show modal
      return {
        success: false,
        order,
        reservations: [],
        insufficientItems,
      };
    } else if (handleInsufficientInventory === "count") {
      // Create cycle count tasks and return
      await createCycleCountTasks(insufficientItems, userId, orderId);
      return {
        success: false,
        order,
        reservations: [],
        insufficientItems,
      };
    }
    // If 'backorder', continue with partial allocation below
  }

  // Second pass: actually reserve inventory
  return prisma.$transaction(async (tx) => {
    const reservations: any[] = [];
    const backOrdersToCreate: any[] = [];

    for (const item of order.items) {
      let remaining = item.quantity;

      const inventoryLocations = item.productVariant.inventory
        .map((inv) => ({
          ...inv,
          quantityAvailable: inv.quantityOnHand - inv.quantityReserved,
        }))
        .filter((inv) => inv.quantityAvailable > 0)
        .sort((a, b) => b.quantityAvailable - a.quantityAvailable);

      for (const inventory of inventoryLocations) {
        if (remaining <= 0) break;

        const qty = Math.min(remaining, inventory.quantityAvailable);

        // ✅ CREATE INVENTORY RESERVATION RECORD
        await tx.inventoryReservation.create({
          data: {
            orderId: order.id,
            productVariantId: item.productVariantId,
            locationId: inventory.locationId,
            quantity: qty,
            status: "ACTIVE",
          },
        });

        // Update inventory reserved quantity
        await tx.inventory.update({
          where: {
            productVariantId_locationId: {
              productVariantId: item.productVariantId,
              locationId: inventory.locationId,
            },
          },
          data: {
            quantityReserved: {
              increment: qty,
            },
          },
        });

        // Create inventory transaction (for audit trail)
        await tx.inventoryTransaction.create({
          data: {
            productVariantId: item.productVariantId,
            locationId: inventory.locationId,
            transactionType: "ALLOCATION",
            quantityChange: -qty,
            referenceId: orderId,
            referenceType: "ORDER",
            userId,
            notes:
              notes ||
              `Auto-reserved ${qty} units for order ${order.orderNumber}`,
          },
        });

        reservations.push({
          productVariantId: item.productVariantId,
          locationId: inventory.locationId,
          locationName: inventory.location.name,
          quantity: qty,
          sku: item.productVariant.sku,
        });

        remaining -= qty;
      }

      // If still remaining and we're in backorder mode, create back order
      if (remaining > 0 && handleInsufficientInventory === "backorder") {
        backOrdersToCreate.push({
          orderId: order.id,
          productVariantId: item.productVariantId,
          quantityBackOrdered: remaining,
          quantityFulfilled: 0,
          status: "PENDING",
          reason: "INSUFFICIENT_STOCK_AT_ALLOCATION",
          reasonDetails: `Insufficient inventory during allocation. Allocated ${
            item.quantity - remaining
          }/${item.quantity} units.`,
          createdDuring: "ORDER_ALLOCATION",
          priority: 0,
        });
      } else if (remaining > 0) {
        // Should not happen if we checked properly, but throw error anyway
        throw new Error(
          `Insufficient inventory for SKU ${item.productVariant.sku}. Short by ${remaining} units.`
        );
      }
    }

    // Create back orders if any
    if (backOrdersToCreate.length > 0) {
      await tx.backOrder.createMany({
        data: backOrdersToCreate,
      });

      // Update order to indicate it has back orders
      await tx.order.update({
        where: { id: orderId },
        data: { hasBackOrders: true },
      });
    }

    return {
      success: true,
      order,
      reservations,
      insufficientItems:
        backOrdersToCreate.length > 0 ? insufficientItems : undefined,
    };
  });
}

// Helper function to create cycle count tasks
async function createCycleCountTasks(
  insufficientItems: InsufficientInventoryItem[],
  userId: string,
  orderId: string
) {
  const tasks = insufficientItems.map((item) => ({
    taskNumber: `CT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    locationId: item.locationId,
    productVariantId: item.productVariantId,
    countType: "NEGATIVE_STOCK" as const,
    status: "PENDING" as const,
    systemQuantity: item.available,
    priority: 10, // High priority
    notes: `Created due to insufficient inventory for order. Expected: ${item.requested}, Available: ${item.available}, Short: ${item.shortage}`,
    requiresRecount: false,
  }));

  await prisma.cycleCountTask.createMany({
    data: tasks,
  });

  // Create notification for the user
  await prisma.notification.create({
    data: {
      userId,
      type: "CYCLE_COUNT_CREATED",
      title: "Cycle Count Tasks Created",
      message: `${tasks.length} cycle count task(s) created due to insufficient inventory for order`,
      link: `/dashboard/cycle-count`,
      metadata: {
        orderId,
        taskCount: tasks.length,
        items: insufficientItems.map((i) => i.sku),
      },
    },
  });

  return tasks;
}

// // lib/reserveInventory.ts
// import { prisma } from "@/lib/prisma";

// // ✅ ADD: Export the interface so it can be used in other files
// export interface ReservationResult {
//   success: boolean;
//   order: any;
//   reservations: any[];
//   insufficientItems?: InsufficientInventoryItem[];
// }

// export interface InsufficientInventoryItem {
//   sku: string;
//   productName: string;
//   productVariantId: string;
//   locationId: string;
//   locationName: string;
//   requested: number;
//   available: number;
//   shortage: number;
// }

// export async function reserveOrderInventory({
//   orderId,
//   userId,
//   handleInsufficientInventory = "throw", // 'throw' | 'backorder' | 'count'
//   notes,
// }: {
//   orderId: string;
//   userId: string;
//   handleInsufficientInventory?: "throw" | "backorder" | "count";
//   notes?: string;
// }): Promise<ReservationResult> {
//   const order = await prisma.order.findUnique({
//     where: { id: orderId },
//     include: {
//       items: {
//         include: {
//           productVariant: {
//             include: {
//               inventory: {
//                 include: {
//                   location: true,
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//   });

//   if (!order) throw new Error("Order not found");
//   if (order.status !== "PENDING") {
//     throw new Error("Order must be in PENDING status to reserve inventory");
//   }

//   // First pass: check for insufficient inventory
//   const insufficientItems: InsufficientInventoryItem[] = [];

//   for (const item of order.items) {
//     let remaining = item.quantity;

//     const inventoryLocations = item.productVariant.inventory
//       .map((inv) => ({
//         ...inv,
//         quantityAvailable: inv.quantityOnHand - inv.quantityReserved,
//       }))
//       .filter((inv) => inv.quantityAvailable > 0)
//       .sort((a, b) => b.quantityAvailable - a.quantityAvailable);

//     // Calculate total available
//     const totalAvailable = inventoryLocations.reduce(
//       (sum, inv) => sum + inv.quantityAvailable,
//       0
//     );

//     if (totalAvailable < remaining) {
//       // Find the primary location (with most stock)
//       const primaryLocation = inventoryLocations[0] || {
//         locationId: item.productVariant.inventory[0]?.locationId,
//         location: { name: item.productVariant.inventory[0]?.location.name },
//         quantityAvailable: 0,
//       };

//       insufficientItems.push({
//         sku: item.productVariant.sku,
//         productName: item.productVariant.name,
//         productVariantId: item.productVariantId,
//         locationId: primaryLocation.locationId,
//         locationName: primaryLocation.location.name,
//         requested: item.quantity,
//         available: totalAvailable,
//         shortage: remaining - totalAvailable,
//       });
//     }
//   }

//   // If there are insufficient items, handle based on strategy
//   if (insufficientItems.length > 0) {
//     if (handleInsufficientInventory === "throw") {
//       // Return error with details for UI to show modal
//       return {
//         success: false,
//         order,
//         reservations: [],
//         insufficientItems,
//       };
//     } else if (handleInsufficientInventory === "count") {
//       // Create cycle count tasks and return
//       await createCycleCountTasks(insufficientItems, userId, orderId);
//       return {
//         success: false,
//         order,
//         reservations: [],
//         insufficientItems,
//       };
//     }
//     // If 'backorder', continue with partial allocation below
//   }

//   // Second pass: actually reserve inventory
//   return prisma.$transaction(async (tx) => {
//     const reservations: any[] = [];
//     const backOrdersToCreate: any[] = [];

//     for (const item of order.items) {
//       let remaining = item.quantity;

//       const inventoryLocations = item.productVariant.inventory
//         .map((inv) => ({
//           ...inv,
//           quantityAvailable: inv.quantityOnHand - inv.quantityReserved,
//         }))
//         .filter((inv) => inv.quantityAvailable > 0)
//         .sort((a, b) => b.quantityAvailable - a.quantityAvailable);

//       for (const inventory of inventoryLocations) {
//         if (remaining <= 0) break;

//         const qty = Math.min(remaining, inventory.quantityAvailable);

//         await tx.inventory.update({
//           where: {
//             productVariantId_locationId: {
//               productVariantId: item.productVariantId,
//               locationId: inventory.locationId,
//             },
//           },
//           data: {
//             quantityReserved: {
//               increment: qty,
//             },
//           },
//         });

//         await tx.inventoryTransaction.create({
//           data: {
//             productVariantId: item.productVariantId,
//             locationId: inventory.locationId,
//             transactionType: "ALLOCATION",
//             quantityChange: -qty,
//             referenceId: orderId,
//             referenceType: "ORDER",
//             userId,
//             notes:
//               notes ||
//               `Auto-reserved ${qty} units for order ${order.orderNumber}`,
//           },
//         });

//         reservations.push({
//           productVariantId: item.productVariantId,
//           locationId: inventory.locationId,
//           quantity: qty,
//           sku: item.productVariant.sku,
//         });

//         remaining -= qty;
//       }

//       // If still remaining and we're in backorder mode, create back order
//       if (remaining > 0 && handleInsufficientInventory === "backorder") {
//         backOrdersToCreate.push({
//           orderId: order.id,
//           productVariantId: item.productVariantId,
//           quantityBackOrdered: remaining,
//           quantityFulfilled: 0,
//           status: "PENDING",
//           reason: "INSUFFICIENT_STOCK_AT_ALLOCATION",
//           reasonDetails: `Insufficient inventory during allocation. Allocated ${
//             item.quantity - remaining
//           }/${item.quantity} units.`,
//           createdDuring: "ORDER_ALLOCATION",
//           priority: 0,
//         });
//       } else if (remaining > 0) {
//         // Should not happen if we checked properly, but throw error anyway
//         throw new Error(
//           `Insufficient inventory for SKU ${item.productVariant.sku}. Short by ${remaining} units.`
//         );
//       }
//     }

//     // Create back orders if any
//     if (backOrdersToCreate.length > 0) {
//       await tx.backOrder.createMany({
//         data: backOrdersToCreate,
//       });

//       // Update order to indicate it has back orders
//       await tx.order.update({
//         where: { id: orderId },
//         data: { hasBackOrders: true },
//       });
//     }

//     return {
//       success: true,
//       order,
//       reservations,
//       insufficientItems:
//         backOrdersToCreate.length > 0 ? insufficientItems : undefined,
//     };
//   });
// }

// // Helper function to create cycle count tasks
// async function createCycleCountTasks(
//   insufficientItems: InsufficientInventoryItem[],
//   userId: string,
//   orderId: string
// ) {
//   const tasks = insufficientItems.map((item) => ({
//     taskNumber: `CT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
//     locationId: item.locationId,
//     productVariantId: item.productVariantId,
//     countType: "NEGATIVE_STOCK" as const, // ✅ Type as enum
//     status: "PENDING" as const, // ✅ Type as enum
//     systemQuantity: item.available,
//     priority: 10, // High priority
//     notes: `Created due to insufficient inventory for order. Expected: ${item.requested}, Available: ${item.available}, Short: ${item.shortage}`,
//     requiresRecount: false,
//   }));

//   await prisma.cycleCountTask.createMany({
//     data: tasks,
//   });

//   // Create notification for the user
//   await prisma.notification.create({
//     data: {
//       userId,
//       type: "CYCLE_COUNT_CREATED",
//       title: "Cycle Count Tasks Created",
//       message: `${tasks.length} cycle count task(s) created due to insufficient inventory for order`,
//       link: `/dashboard/cycle-count`,
//       metadata: {
//         orderId,
//         taskCount: tasks.length,
//         items: insufficientItems.map((i) => i.sku),
//       },
//     },
//   });

//   return tasks;
// }
