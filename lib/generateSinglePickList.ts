import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/order-status-helper"; // ✅ ADD THIS

interface GeneratePickListOptions {
  orderIds: string[];
  maxItems?: number;
  pickingStrategy?: "SINGLE" | "BATCH" | "ZONE";
  priority?: "FIFO" | "PRIORITY" | "CUSTOMER";
  assignTo?: string;
  userId: string;
}

interface PickItem {
  orderId: string;
  orderNumber: string;
  productVariantId: string;
  locationId: string;
  locationName: string;
  sku: string;
  productName: string;
  quantityToPick: number;
  zone: string;
}

function optimizePickSequence(items: PickItem[]) {
  const groupedByZone = items.reduce(
    (acc: Record<string, PickItem[]>, item) => {
      const zone = item.zone;
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(item);
      return acc;
    },
    {}
  );

  const optimizedItems: PickItem[] = [];
  const sortedZones = Object.keys(groupedByZone).sort();

  for (const zone of sortedZones) {
    const zoneItems = groupedByZone[zone].sort((a, b) =>
      a.locationName.localeCompare(b.locationName)
    );
    optimizedItems.push(...zoneItems);
  }

  return optimizedItems;
}

export async function generateSinglePickList({
  orderIds,
  maxItems = 50,
  pickingStrategy = "SINGLE",
  priority = "FIFO",
  assignTo,
  userId,
}: GeneratePickListOptions) {
  const whereClause = {
    status: "ALLOCATED" as const,
    id: { in: orderIds },
  };

  const allocatedOrders = await prisma.order.findMany({
    where: whereClause,
    include: {
      items: {
        include: {
          productVariant: {
            include: {
              inventory: {
                where: {
                  quantityReserved: { gt: 0 },
                },
                include: {
                  location: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy:
      priority === "FIFO" ? { createdAt: "asc" } : { totalAmount: "desc" },
    take: pickingStrategy === "SINGLE" ? 1 : undefined,
  });

  if (allocatedOrders.length === 0) {
    throw new Error("No allocated orders found for picking");
  }

  const pickItems: PickItem[] = [];
  let totalItems = 0;

  for (const order of allocatedOrders) {
    for (const orderItem of order.items) {
      const reservedInventory = orderItem.productVariant.inventory
        .filter((inv) => inv.quantityReserved > 0)
        .sort((a, b) => b.quantityReserved - a.quantityReserved);

      let remainingToPick = orderItem.quantity;

      for (const inventory of reservedInventory) {
        if (remainingToPick <= 0) break;

        const quantityFromThisLocation = Math.min(
          remainingToPick,
          inventory.quantityReserved
        );

        pickItems.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          productVariantId: orderItem.productVariantId,
          locationId: inventory.locationId,
          locationName: inventory.location.name,
          sku: orderItem.productVariant.sku,
          productName: orderItem.productVariant.name,
          quantityToPick: quantityFromThisLocation,
          zone: inventory.location.name.split("-")[0] || "MAIN",
        });

        remainingToPick -= quantityFromThisLocation;
        totalItems += quantityFromThisLocation;
        if (totalItems >= maxItems) break;
      }

      if (totalItems >= maxItems) break;
    }
    if (totalItems >= maxItems) break;
  }

  const optimizedItems = optimizePickSequence(pickItems);
  const batchNumber = `PL-${Date.now().toString().slice(-6)}`;

  const pickList = await prisma.$transaction(async (tx) => {
    const newPickList = await tx.pickList.create({
      data: {
        batchNumber,
        status: assignTo ? "ASSIGNED" : "PENDING",
        assignedTo: assignTo || null,
        priority: 0,
        totalItems: optimizedItems.length,
        notes: `Generated with ${pickingStrategy} strategy`,
      },
    });

    const pickListItems = await Promise.all(
      optimizedItems.map((item, index) =>
        tx.pickListItem.create({
          data: {
            pickListId: newPickList.id,
            orderId: item.orderId,
            productVariantId: item.productVariantId,
            locationId: item.locationId,
            quantityToPick: item.quantityToPick,
            pickSequence: index + 1,
          },
        })
      )
    );

    // ✅ FIXED: Update order status with history for each order
    const orderIdsToUpdate = [...new Set(optimizedItems.map((i) => i.orderId))];

    for (const orderId of orderIdsToUpdate) {
      await updateOrderStatus({
        orderId,
        newStatus: "PICKING",
        userId,
        notes: `Pick list ${batchNumber} generated`,
        tx, // ← Pass transaction client
      });
    }

    // Log pick list creation event
    await tx.pickEvent.create({
      data: {
        pickListId: newPickList.id,
        eventType: "PICK_STARTED",
        userId,
        notes: `Pick list generated with ${optimizedItems.length} items`,
      },
    });

    return { pickList: newPickList, items: pickListItems, optimizedItems };
  });

  return {
    id: pickList.pickList.id,
    batchNumber,
    totalItems: optimizedItems.length,
    assignedTo: assignTo,
    ordersIncluded: [...new Set(optimizedItems.map((i) => i.orderId))].length,
    zones: [...new Set(optimizedItems.map((i) => i.zone))],
  };
}

// import { prisma } from "@/lib/prisma";

// interface GeneratePickListOptions {
//   orderIds: string[];
//   maxItems?: number;
//   pickingStrategy?: "SINGLE" | "BATCH" | "ZONE";
//   priority?: "FIFO" | "PRIORITY" | "CUSTOMER";
//   assignTo?: string;
//   userId: string;
// }

// interface PickItem {
//   orderId: string;
//   orderNumber: string;
//   productVariantId: string;
//   locationId: string;
//   locationName: string;
//   sku: string;
//   productName: string;
//   quantityToPick: number;
//   zone: string;
// }

// function optimizePickSequence(items: PickItem[]) {
//   const groupedByZone = items.reduce(
//     (acc: Record<string, PickItem[]>, item) => {
//       const zone = item.zone;
//       if (!acc[zone]) acc[zone] = [];
//       acc[zone].push(item);
//       return acc;
//     },
//     {}
//   );

//   const optimizedItems: PickItem[] = [];
//   const sortedZones = Object.keys(groupedByZone).sort();

//   for (const zone of sortedZones) {
//     const zoneItems = groupedByZone[zone].sort((a, b) =>
//       a.locationName.localeCompare(b.locationName)
//     );
//     optimizedItems.push(...zoneItems);
//   }

//   return optimizedItems;
// }

// export async function generateSinglePickList({
//   orderIds,
//   maxItems = 50,
//   pickingStrategy = "SINGLE",
//   priority = "FIFO",
//   assignTo,
//   userId,
// }: GeneratePickListOptions) {
//   const whereClause = {
//     status: "ALLOCATED" as const,
//     id: { in: orderIds },
//   };

//   const allocatedOrders = await prisma.order.findMany({
//     where: whereClause,
//     include: {
//       items: {
//         include: {
//           productVariant: {
//             include: {
//               inventory: {
//                 where: {
//                   quantityReserved: { gt: 0 },
//                 },
//                 include: {
//                   location: true,
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//     orderBy:
//       priority === "FIFO" ? { createdAt: "asc" } : { totalAmount: "desc" },
//     take: pickingStrategy === "SINGLE" ? 1 : undefined,
//   });

//   if (allocatedOrders.length === 0) {
//     throw new Error("No allocated orders found for picking");
//   }

//   const pickItems: PickItem[] = [];
//   let totalItems = 0;

//   for (const order of allocatedOrders) {
//     for (const orderItem of order.items) {
//       const reservedInventory = orderItem.productVariant.inventory
//         .filter((inv) => inv.quantityReserved > 0)
//         .sort((a, b) => b.quantityReserved - a.quantityReserved);

//       let remainingToPick = orderItem.quantity;

//       for (const inventory of reservedInventory) {
//         if (remainingToPick <= 0) break;

//         const quantityFromThisLocation = Math.min(
//           remainingToPick,
//           inventory.quantityReserved
//         );

//         pickItems.push({
//           orderId: order.id,
//           orderNumber: order.orderNumber,
//           productVariantId: orderItem.productVariantId,
//           locationId: inventory.locationId,
//           locationName: inventory.location.name,
//           sku: orderItem.productVariant.sku,
//           productName: orderItem.productVariant.name,
//           quantityToPick: quantityFromThisLocation,
//           zone: inventory.location.name.split("-")[0] || "MAIN",
//         });

//         remainingToPick -= quantityFromThisLocation;
//         totalItems += quantityFromThisLocation;
//         if (totalItems >= maxItems) break;
//       }

//       if (totalItems >= maxItems) break;
//     }
//     if (totalItems >= maxItems) break;
//   }

//   const optimizedItems = optimizePickSequence(pickItems);
//   const batchNumber = `PL-${Date.now().toString().slice(-6)}`;

//   const pickList = await prisma.$transaction(async (tx) => {
//     const newPickList = await tx.pickList.create({
//       data: {
//         batchNumber,
//         status: assignTo ? "ASSIGNED" : "PENDING",
//         assignedTo: assignTo || null,
//         priority: 0,
//         totalItems: optimizedItems.length,
//         notes: `Generated with ${pickingStrategy} strategy`,
//       },
//     });

//     const pickListItems = await Promise.all(
//       optimizedItems.map((item, index) =>
//         tx.pickListItem.create({
//           data: {
//             pickListId: newPickList.id,
//             orderId: item.orderId,
//             productVariantId: item.productVariantId,
//             locationId: item.locationId,
//             quantityToPick: item.quantityToPick,
//             pickSequence: index + 1,
//           },
//         })
//       )
//     );

//     await tx.order.updateMany({
//       where: { id: { in: [...new Set(optimizedItems.map((i) => i.orderId))] } },
//       data: { status: "PICKING" },
//     });

//     await tx.pickEvent.create({
//       data: {
//         pickListId: newPickList.id,
//         eventType: "PICK_STARTED",
//         userId,
//         notes: `Pick list generated with ${optimizedItems.length} items`,
//       },
//     });

//     return { pickList: newPickList, items: pickListItems, optimizedItems };
//   });

//   return {
//     id: pickList.pickList.id,
//     batchNumber,
//     totalItems: optimizedItems.length,
//     assignedTo: assignTo,
//     ordersIncluded: [...new Set(optimizedItems.map((i) => i.orderId))].length,
//     zones: [...new Set(optimizedItems.map((i) => i.zone))],
//   };
// }
