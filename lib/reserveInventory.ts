// lib/reserveInventory.ts
import { prisma } from "@/lib/prisma";
// import { Prisma } from "@prisma/client";

export async function reserveOrderInventory({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}) {
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

  return prisma.$transaction(async (tx) => {
    const reservations: any[] = [];

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

        await tx.inventoryTransaction.create({
          data: {
            productVariantId: item.productVariantId,
            locationId: inventory.locationId,
            transactionType: "ALLOCATION",
            quantityChange: -qty,
            referenceId: orderId,
            referenceType: "ORDER",
            userId,
            notes: `Auto-reserved ${qty} units for order ${order.orderNumber}`,
          },
        });

        reservations.push({
          productVariantId: item.productVariantId,
          locationId: inventory.locationId,
          quantity: qty,
          sku: item.productVariant.sku,
        });

        remaining -= qty;
      }

      if (remaining > 0) {
        throw new Error(
          `Insufficient inventory for SKU ${item.productVariant.sku}. Short by ${remaining} units.`
        );
      }
    }

    // ✅ REMOVED: Status update - let the actions route handle it
    // This function now ONLY handles inventory reservation
    // The calling code will update status with proper history tracking

    return {
      order: order, // Return original order, not updated one
      reservations,
    };
  });
}

// // lib/reserveInventory.ts
// import { prisma } from "@/lib/prisma";
// import { Prisma } from "@prisma/client";

// export async function reserveOrderInventory({
//   orderId,
//   userId,
// }: {
//   orderId: string;
//   userId: string;
// }) {
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

//   return prisma.$transaction(async (tx) => {
//     const reservations: any[] = [];

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
//             notes: `Auto-reserved ${qty} units for order ${order.orderNumber}`,
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

//       if (remaining > 0) {
//         throw new Error(
//           `Insufficient inventory for SKU ${item.productVariant.sku}. Short by ${remaining} units.`
//         );
//       }
//     }

//     const updatedOrder = await tx.order.update({
//       where: { id: orderId },
//       data: { status: "ALLOCATED" },
//     });

//     return { order: updatedOrder, reservations };
//   });
// }
