// app/api/picking/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/order-status-helper";

interface GeneratePickListRequest {
  orderIds?: string[];
  maxItems?: number;
  pickingStrategy?: "SINGLE" | "BATCH" | "ZONE";
  priority?: "FIFO" | "PRIORITY" | "CUSTOMER";
  assignTo?: string;
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      orderIds,
      maxItems = 50,
      pickingStrategy = "BATCH",
      priority = "FIFO",
      assignTo,
    }: GeneratePickListRequest = await request.json();

    console.log(
      `📋 Generating pick list - Strategy: ${pickingStrategy}, Max items: ${maxItems}`
    );
    if (orderIds) {
      console.log(`📋 Specific orders requested: ${orderIds.join(", ")}`);
    }

    // Get allocated orders ready for picking
    const whereClause = {
      status: "ALLOCATED" as const,
      ...(orderIds ? { id: { in: orderIds } } : {}),
    };

    const allocatedOrders = await prisma.order.findMany({
      where: whereClause,
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
        // ✅ NEW: Include back orders to know what quantities to pick
        backOrders: {
          where: {
            status: "ALLOCATED",
          },
        },
      },
      orderBy:
        priority === "FIFO" ? { createdAt: "asc" } : { totalAmount: "desc" },
      take: pickingStrategy === "SINGLE" ? 1 : undefined,
    });

    if (allocatedOrders.length === 0) {
      return NextResponse.json(
        { error: "No allocated orders found for picking" },
        { status: 400 }
      );
    }

    console.log(`📦 Found ${allocatedOrders.length} allocated orders`);

    // Collect all items that need to be picked
    const pickItems: PickItem[] = [];
    let totalItems = 0;
    const skippedItems: Array<{ sku: string; reason: string }> = [];

    for (const order of allocatedOrders) {
      console.log(`\n📦 Processing order ${order.orderNumber} (${order.id})`);

      const hasBackOrders = order.backOrders.length > 0;
      console.log(
        `   ${hasBackOrders ? "🔄 Back order mode" : "📦 Normal order mode"}`
      );
      console.log(`   Order has ${order.items.length} line items`);

      // ✅ NEW: Get order-specific reservations
      const orderReservations = await prisma.inventoryReservation.findMany({
        where: {
          orderId: order.id,
          status: "ACTIVE",
        },
        include: {
          location: true,
        },
      });

      console.log(
        `   📍 Found ${orderReservations.length} reservation(s) for this order`
      );

      for (const orderItem of order.items) {
        console.log(
          `\n  📄 Item: ${orderItem.productVariant.sku} - ${orderItem.productVariant.name}`
        );

        // ✅ FIXED: Determine quantity to pick based on back orders
        let quantityNeeded = orderItem.quantity;

        if (hasBackOrders) {
          const backOrder = order.backOrders.find(
            (bo) => bo.productVariantId === orderItem.productVariantId
          );

          if (backOrder) {
            quantityNeeded =
              backOrder.quantityBackOrdered - backOrder.quantityFulfilled;
            console.log(`     🔄 Back order quantity: ${quantityNeeded} units`);
          } else {
            console.log(
              `     ⏭️  Skipping - no back order for this product (already fulfilled)`
            );
            continue; // Skip items without back orders
          }
        }

        console.log(`     📊 Quantity needed: ${quantityNeeded}`);

        // ✅ FIXED: Filter reservations for THIS order and THIS product
        const productReservations = orderReservations
          .filter((r) => r.productVariantId === orderItem.productVariantId)
          .sort((a, b) => b.quantity - a.quantity);

        if (productReservations.length === 0) {
          const errorMsg = `No reservations found for SKU ${orderItem.productVariant.sku} on this order`;
          console.error(`     ❌ ERROR: ${errorMsg}`);
          skippedItems.push({
            sku: orderItem.productVariant.sku,
            reason: errorMsg,
          });
          continue;
        }

        console.log(
          `     ✅ Found ${productReservations.length} reservation(s) for this product:`
        );
        productReservations.forEach((r) => {
          console.log(
            `        - ${r.location.name}: ${r.quantity} units reserved`
          );
        });

        let remainingToPick = quantityNeeded;

        for (const reservation of productReservations) {
          if (remainingToPick <= 0) break;

          const quantityFromThisLocation = Math.min(
            remainingToPick,
            reservation.quantity // ✅ Use reservation quantity, not total inventory
          );

          console.log(
            `     📍 Adding pick task: ${quantityFromThisLocation} units from ${reservation.location.name}`
          );

          pickItems.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            productVariantId: orderItem.productVariantId,
            locationId: reservation.locationId,
            locationName: reservation.location.name,
            sku: orderItem.productVariant.sku,
            productName: orderItem.productVariant.name,
            quantityToPick: quantityFromThisLocation,
            zone: reservation.location.name.split("-")[0] || "MAIN",
          });

          remainingToPick -= quantityFromThisLocation;
          totalItems += quantityFromThisLocation;

          if (totalItems >= maxItems) {
            console.log(`⚠️ Reached maxItems limit (${maxItems})`);
            break;
          }
        }

        if (remainingToPick > 0) {
          const errorMsg = `Insufficient reservations for SKU ${
            orderItem.productVariant.sku
          }. Need ${quantityNeeded}, only ${
            quantityNeeded - remainingToPick
          } reserved`;
          console.error(`     ❌ ERROR: ${errorMsg}`);
          skippedItems.push({
            sku: orderItem.productVariant.sku,
            reason: errorMsg,
          });
        }

        if (totalItems >= maxItems) break;
      }
      if (totalItems >= maxItems) break;
    }

    // ✅ ERROR HANDLING: If items were skipped, include warning in response
    if (skippedItems.length > 0) {
      console.error(`\n❌ WARNING: ${skippedItems.length} item(s) skipped:`);
      skippedItems.forEach((item) => {
        console.error(`   - ${item.sku}: ${item.reason}`);
      });
    }

    if (pickItems.length === 0) {
      return NextResponse.json(
        {
          error: "No pick items could be generated",
          details: skippedItems,
        },
        { status: 400 }
      );
    }

    console.log(
      `\n📊 Collected ${pickItems.length} pick items, ${totalItems} total quantity`
    );
    console.log(
      `📊 Unique SKUs: ${[...new Set(pickItems.map((i) => i.sku))].join(", ")}`
    );

    // Optimize pick sequence based on location zones and paths
    const optimizedItems = optimizePickSequence(pickItems);

    // Generate unique batch number
    const batchNumber = `PL-${Date.now().toString().slice(-6)}`;

    // Create pick list with optimized items
    const pickList = await prisma.$transaction(async (tx) => {
      // Create the pick list
      const newPickList = await tx.pickList.create({
        data: {
          batchNumber,
          status: assignTo ? "ASSIGNED" : "PENDING",
          assignedTo: assignTo || null,
          priority: 0,
          totalItems: optimizedItems.length,
          notes: `Generated with ${pickingStrategy} strategy${
            skippedItems.length > 0
              ? ` (${skippedItems.length} item(s) skipped)`
              : ""
          }`,
        },
      });

      console.log(`\n✅ Created pick list ${batchNumber}`);

      // Create pick list items
      const pickListItems = await Promise.all(
        optimizedItems.map((item, index) => {
          console.log(
            `   ${index + 1}. ${item.sku} x${item.quantityToPick} @ ${
              item.locationName
            }`
          );
          return tx.pickListItem.create({
            data: {
              pickListId: newPickList.id,
              orderId: item.orderId,
              productVariantId: item.productVariantId,
              locationId: item.locationId,
              quantityToPick: item.quantityToPick,
              pickSequence: index + 1,
            },
          });
        })
      );

      // Update orders to PICKING status WITH status history
      const orderIdsToUpdate = [
        ...new Set(optimizedItems.map((item) => item.orderId)),
      ];

      console.log(
        `\n📝 Updating ${orderIdsToUpdate.length} order(s) to PICKING status`
      );

      for (const orderId of orderIdsToUpdate) {
        // Update order status
        await updateOrderStatus({
          orderId,
          newStatus: "PICKING",
          userId: session.user.id,
          notes: `Pick list ${batchNumber} generated`,
          tx,
        });

        // ✅ UPDATE: Also update any ALLOCATED back orders for this order to PICKING
        await tx.backOrder.updateMany({
          where: {
            orderId: orderId,
            status: "ALLOCATED",
          },
          data: {
            status: "PICKING",
          },
        });
      }

      // Log the generation event
      await tx.pickEvent.create({
        data: {
          pickListId: newPickList.id,
          eventType: "PICK_STARTED",
          userId: session.user.id,
          notes: `Pick list generated with ${optimizedItems.length} items${
            skippedItems.length > 0
              ? `. Skipped items: ${skippedItems.map((i) => i.sku).join(", ")}`
              : ""
          }`,
        },
      });

      return { pickList: newPickList, items: pickListItems };
    });

    console.log(
      `\n✅ Successfully created pick list ${batchNumber} with ${optimizedItems.length} items`
    );

    return NextResponse.json({
      success: true,
      pickList: {
        id: pickList.pickList.id,
        batchNumber,
        status: pickList.pickList.status,
        totalItems: optimizedItems.length,
        assignedTo: assignTo,
        items: optimizedItems.map((item, index) => ({
          sequence: index + 1,
          location: item.locationName,
          sku: item.sku,
          productName: item.productName,
          quantity: item.quantityToPick,
          orderNumber: item.orderNumber,
        })),
      },
      summary: {
        ordersIncluded: [...new Set(optimizedItems.map((item) => item.orderId))]
          .length,
        totalItems: optimizedItems.length,
        estimatedPickTime: Math.ceil(optimizedItems.length * 1.5),
        zones: [...new Set(optimizedItems.map((item) => item.zone))],
      },
      // ✅ Include warnings if items were skipped
      ...(skippedItems.length > 0 && {
        warnings: {
          skippedItems,
          message: `${skippedItems.length} item(s) could not be added to pick list`,
        },
      }),
    });
  } catch (error) {
    console.error("❌ Pick list generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate pick list",
      },
      { status: 500 }
    );
  }
}

// Route optimization function
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

// GET endpoint to retrieve pick lists
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");

    const pickLists = await prisma.pickList.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(assignedTo ? { assignedTo } : {}),
      },
      include: {
        assignedUser: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            order: { select: { orderNumber: true } },
            productVariant: { select: { sku: true, name: true } },
            location: { select: { name: true } },
          },
          orderBy: { pickSequence: "asc" },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      pickLists: pickLists.map((list) => ({
        id: list.id,
        batchNumber: list.batchNumber,
        status: list.status,
        assignedTo: list.assignedUser?.name || null,
        totalItems: list.totalItems,
        pickedItems: list.pickedItems,
        progress:
          list.totalItems > 0
            ? Math.round((list.pickedItems / list.totalItems) * 100)
            : 0,
        startTime: list.startTime,
        endTime: list.endTime,
        createdAt: list.createdAt,
        itemCount: list._count.items,
        orders: [...new Set(list.items.map((item) => item.order.orderNumber))],
      })),
    });
  } catch (error) {
    console.error("❌ Error fetching pick lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch pick lists" },
      { status: 500 }
    );
  }
}

// // app/api/picking/generate/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";

// interface GeneratePickListRequest {
//   orderIds?: string[];
//   maxItems?: number;
//   pickingStrategy?: "SINGLE" | "BATCH" | "ZONE";
//   priority?: "FIFO" | "PRIORITY" | "CUSTOMER";
//   assignTo?: string;
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

// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const {
//       orderIds,
//       maxItems = 50,
//       pickingStrategy = "BATCH",
//       priority = "FIFO",
//       assignTo,
//     }: GeneratePickListRequest = await request.json();

//     console.log(
//       `📋 Generating pick list - Strategy: ${pickingStrategy}, Max items: ${maxItems}`
//     );

//     // Get allocated orders ready for picking
//     const whereClause = {
//       status: "ALLOCATED" as const,
//       ...(orderIds ? { id: { in: orderIds } } : {}),
//     };

//     const allocatedOrders = await prisma.order.findMany({
//       where: whereClause,
//       include: {
//         items: {
//           include: {
//             productVariant: {
//               include: {
//                 inventory: {
//                   where: {
//                     quantityReserved: { gt: 0 },
//                   },
//                   include: {
//                     location: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//       orderBy:
//         priority === "FIFO" ? { createdAt: "asc" } : { totalAmount: "desc" },
//       take: pickingStrategy === "SINGLE" ? 1 : undefined,
//     });

//     if (allocatedOrders.length === 0) {
//       return NextResponse.json(
//         { error: "No allocated orders found for picking" },
//         { status: 400 }
//       );
//     }

//     console.log(`📦 Found ${allocatedOrders.length} allocated orders`);

//     // Collect all items that need to be picked
//     const pickItems = [];
//     let totalItems = 0;

//     for (const order of allocatedOrders) {
//       for (const orderItem of order.items) {
//         // Find inventory locations with reserved stock
//         const reservedInventory = orderItem.productVariant.inventory
//           .filter((inv) => inv.quantityReserved > 0)
//           .sort((a, b) => b.quantityReserved - a.quantityReserved);

//         let remainingToPick = orderItem.quantity;

//         for (const inventory of reservedInventory) {
//           if (remainingToPick <= 0) break;

//           const quantityFromThisLocation = Math.min(
//             remainingToPick,
//             inventory.quantityReserved
//           );

//           pickItems.push({
//             orderId: order.id,
//             orderNumber: order.orderNumber,
//             productVariantId: orderItem.productVariantId,
//             locationId: inventory.locationId,
//             locationName: inventory.location.name,
//             sku: orderItem.productVariant.sku,
//             productName: orderItem.productVariant.name,
//             quantityToPick: quantityFromThisLocation,
//             // Zone for optimization (extract from location name like "A1-B2" -> zone "A")
//             zone: inventory.location.name.split("-")[0] || "MAIN",
//           });

//           remainingToPick -= quantityFromThisLocation;
//           totalItems += quantityFromThisLocation;

//           // Stop if we hit max items limit
//           if (totalItems >= maxItems) break;
//         }

//         if (totalItems >= maxItems) break;
//       }
//       if (totalItems >= maxItems) break;
//     }

//     console.log(
//       `📊 Collected ${pickItems.length} pick items, ${totalItems} total quantity`
//     );

//     // Optimize pick sequence based on location zones and paths
//     const optimizedItems = optimizePickSequence(pickItems);

//     // Generate unique batch number
//     const batchNumber = `PL-${Date.now().toString().slice(-6)}`;

//     // Create pick list with optimized items
//     const pickList = await prisma.$transaction(async (tx) => {
//       // Create the pick list
//       const newPickList = await tx.pickList.create({
//         data: {
//           batchNumber,
//           status: assignTo ? "ASSIGNED" : "PENDING",
//           assignedTo: assignTo || null,
//           priority: 0,
//           totalItems: optimizedItems.length,
//           notes: `Generated with ${pickingStrategy} strategy`,
//         },
//       });

//       // Create pick list items
//       const pickListItems = await Promise.all(
//         optimizedItems.map((item, index) =>
//           tx.pickListItem.create({
//             data: {
//               pickListId: newPickList.id,
//               orderId: item.orderId,
//               productVariantId: item.productVariantId,
//               locationId: item.locationId,
//               quantityToPick: item.quantityToPick,
//               pickSequence: index + 1,
//             },
//           })
//         )
//       );

//       // Update orders to PICKING status
//       const orderIdsToUpdate = [
//         ...new Set(optimizedItems.map((item) => item.orderId)),
//       ];
//       await tx.order.updateMany({
//         where: { id: { in: orderIdsToUpdate } },
//         data: { status: "PICKING" },
//       });

//       // Log the generation event
//       await tx.pickEvent.create({
//         data: {
//           pickListId: newPickList.id,
//           eventType: "PICK_STARTED",
//           userId: session.user.id,
//           notes: `Pick list generated with ${optimizedItems.length} items`,
//         },
//       });

//       return { pickList: newPickList, items: pickListItems };
//     });

//     console.log(
//       `✅ Created pick list ${batchNumber} with ${optimizedItems.length} items`
//     );

//     return NextResponse.json({
//       success: true,
//       pickList: {
//         id: pickList.pickList.id,
//         batchNumber,
//         status: pickList.pickList.status,
//         totalItems: optimizedItems.length,
//         assignedTo: assignTo,
//         items: optimizedItems.map((item, index) => ({
//           sequence: index + 1,
//           location: item.locationName,
//           sku: item.sku,
//           productName: item.productName,
//           quantity: item.quantityToPick,
//           orderNumber: item.orderNumber,
//         })),
//       },
//       summary: {
//         ordersIncluded: [...new Set(optimizedItems.map((item) => item.orderId))]
//           .length,
//         totalItems: optimizedItems.length,
//         estimatedPickTime: Math.ceil(optimizedItems.length * 1.5), // 1.5 min per item estimate
//         zones: [...new Set(optimizedItems.map((item) => item.zone))],
//       },
//     });
//   } catch (error) {
//     console.error("❌ Pick list generation error:", error);
//     return NextResponse.json(
//       {
//         error:
//           error instanceof Error
//             ? error.message
//             : "Failed to generate pick list",
//       },
//       { status: 500 }
//     );
//   }
// }

// // Route optimization function
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

// // GET endpoint to retrieve pick lists
// export async function GET(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { searchParams } = new URL(request.url);
//     const status = searchParams.get("status");
//     const assignedTo = searchParams.get("assignedTo");

//     const pickLists = await prisma.pickList.findMany({
//       where: {
//         ...(status ? { status: status as any } : {}),
//         ...(assignedTo ? { assignedTo } : {}),
//       },
//       include: {
//         assignedUser: {
//           select: { id: true, name: true },
//         },
//         items: {
//           include: {
//             order: { select: { orderNumber: true } },
//             productVariant: { select: { sku: true, name: true } },
//             location: { select: { name: true } },
//           },
//           orderBy: { pickSequence: "asc" },
//         },
//         _count: {
//           select: { items: true },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//       take: 50,
//     });

//     return NextResponse.json({
//       pickLists: pickLists.map((list) => ({
//         id: list.id,
//         batchNumber: list.batchNumber,
//         status: list.status,
//         assignedTo: list.assignedUser?.name || null,
//         totalItems: list.totalItems,
//         pickedItems: list.pickedItems,
//         progress:
//           list.totalItems > 0
//             ? Math.round((list.pickedItems / list.totalItems) * 100)
//             : 0,
//         startTime: list.startTime,
//         endTime: list.endTime,
//         createdAt: list.createdAt,
//         itemCount: list._count.items,
//         orders: [...new Set(list.items.map((item) => item.order.orderNumber))],
//       })),
//     });
//   } catch (error) {
//     console.error("❌ Error fetching pick lists:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch pick lists" },
//       { status: 500 }
//     );
//   }
// }
