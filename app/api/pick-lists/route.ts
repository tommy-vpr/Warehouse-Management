// app/api/pick-lists/route.ts
import { prisma } from "@/lib/prisma";
import { link } from "fs";
import { NextRequest, NextResponse } from "next/server";

// GET /api/pick-lists - Get all pick lists with filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assignedTo");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    const skip = (page - 1) * limit;

    const where = {
      // Handle comma-separated status values
      ...(status && {
        status: {
          in: status.split(",").map((s) => s.trim()),
        },
      }),
      ...(assignedTo && { assignedTo }),
    };

    // Get total count for pagination
    const totalCount = await prisma.pickList.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    const pickLists = await prisma.pickList.findMany({
      where,
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
            location: true,
            order: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Calculate progress for each pick list
    const pickListsWithProgress = pickLists.map((pl) => ({
      ...pl,
      completionRate:
        pl.totalItems > 0
          ? Math.round((pl.pickedItems / pl.totalItems) * 100)
          : 0,
      itemsRemaining: pl.totalItems - pl.pickedItems,
    }));

    return NextResponse.json({
      pickLists: pickListsWithProgress,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching pick lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch pick lists", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/pick-lists - Create new pick list
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderIds, assignedTo, priority } = body;

    // Validate input
    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json(
        { error: "No orders selected" },
        { status: 400 }
      );
    }

    if (!assignedTo) {
      return NextResponse.json(
        { error: "No staff member assigned" },
        { status: 400 }
      );
    }

    // Get all items needed for these orders
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                inventory: {
                  where: { quantityOnHand: { gt: 0 } },
                  orderBy: { quantityOnHand: "desc" },
                },
              },
            },
          },
        },
      },
    });

    if (orders.length === 0) {
      return NextResponse.json({ error: "No orders found" }, { status: 404 });
    }

    // Build pick list items with route optimization
    const pickListItems = [];
    let sequence = 1;

    for (const order of orders) {
      for (const item of order.items) {
        const inventory = item.productVariant.inventory[0];
        if (!inventory) {
          console.warn(
            `No inventory found for product variant ${item.productVariantId}`
          );
          continue;
        }

        pickListItems.push({
          orderId: order.id,
          productVariantId: item.productVariantId,
          locationId: inventory.locationId,
          quantityToPick: item.quantity,
          pickSequence: sequence++,
        });
      }
    }

    if (pickListItems.length === 0) {
      return NextResponse.json(
        { error: "No items available to pick" },
        { status: 400 }
      );
    }

    // Generate batch number
    const batchNumber = `WAVE-${Date.now().toString().slice(-6)}`;

    const pickList = await prisma.pickList.create({
      data: {
        batchNumber,
        assignedTo,
        priority: priority || 0,
        totalItems: pickListItems.length,
        status: "ASSIGNED",
        items: {
          create: pickListItems,
        },
      },
      include: {
        items: {
          include: {
            productVariant: { include: { product: true } },
            location: true,
          },
        },
      },
    });

    // Update order statuses
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        status: "PICKING",
        pickingAssignedTo: assignedTo,
        pickingAssignedAt: new Date(),
      },
    });

    console.log(
      `✅ Pick list ${batchNumber} created with ${pickListItems.length} items`
    );

    // ========================================
    // 🔔 SEND NOTIFICATION TO ASSIGNED PICKER
    // ========================================
    try {
      const { notifyUser } = await import("@/lib/ably-server");

      await notifyUser(assignedTo, {
        type: "PICK_LIST_ASSIGNED",
        title: "New Pick List Assigned",
        message: `You have been assigned to pick ${pickListItems.length} item${
          pickListItems.length > 1 ? "s" : ""
        } from ${orders.length} order${
          orders.length > 1 ? "s" : ""
        } (${batchNumber})`,
        // link: `/pick-lists/${pickList.id}`,
        link: `/dashboard/picking/mobile/${pickList.id}`,
        metadata: {
          batchNumber: batchNumber,
          totalItems: pickListItems.length,
          totalOrders: orders.length,
          priority: priority || 0,
        },
      });

      console.log(`✅ Notification sent to picker ${assignedTo}`);
    } catch (notificationError) {
      console.error("Failed to send notification:", notificationError);
      // Don't fail the entire request if notification fails
    }

    return NextResponse.json(pickList, { status: 201 });
  } catch (error) {
    console.error("Error creating pick list:", error);
    return NextResponse.json(
      { error: "Failed to create pick list", details: error.message },
      { status: 500 }
    );
  }
}

// // app/api/pick-lists/route.ts
// import { prisma } from "@/lib/prisma";
// import { link } from "fs";
// import { NextRequest, NextResponse } from "next/server";

// // GET /api/pick-lists - Get all pick lists with filters
// export async function GET(req: NextRequest) {
//   const { searchParams } = new URL(req.url);
//   const status = searchParams.get("status");
//   const assignedTo = searchParams.get("assignedTo");

//   try {
//     const pickLists = await prisma.pickList.findMany({
//       where: {
//         // Handle comma-separated status values
//         ...(status && {
//           status: {
//             in: status.split(",").map((s) => s.trim()),
//           },
//         }),
//         ...(assignedTo && { assignedTo }),
//       },
//       include: {
//         assignedUser: {
//           select: { id: true, name: true, email: true },
//         },
//         items: {
//           include: {
//             productVariant: {
//               include: { product: true },
//             },
//             location: true,
//             order: true,
//           },
//         },
//         _count: {
//           select: { items: true },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     // Calculate progress for each pick list
//     const pickListsWithProgress = pickLists.map((pl) => ({
//       ...pl,
//       completionRate:
//         pl.totalItems > 0
//           ? Math.round((pl.pickedItems / pl.totalItems) * 100)
//           : 0,
//       itemsRemaining: pl.totalItems - pl.pickedItems,
//     }));

//     return NextResponse.json(pickListsWithProgress);
//   } catch (error) {
//     console.error("Error fetching pick lists:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch pick lists", details: error.message },
//       { status: 500 }
//     );
//   }
// }

// // POST /api/pick-lists - Create new pick list
// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { orderIds, assignedTo, priority } = body;

//     // Validate input
//     if (!orderIds || orderIds.length === 0) {
//       return NextResponse.json(
//         { error: "No orders selected" },
//         { status: 400 }
//       );
//     }

//     if (!assignedTo) {
//       return NextResponse.json(
//         { error: "No staff member assigned" },
//         { status: 400 }
//       );
//     }

//     // Get all items needed for these orders
//     const orders = await prisma.order.findMany({
//       where: { id: { in: orderIds } },
//       include: {
//         items: {
//           include: {
//             productVariant: {
//               include: {
//                 inventory: {
//                   where: { quantityOnHand: { gt: 0 } },
//                   orderBy: { quantityOnHand: "desc" },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });

//     if (orders.length === 0) {
//       return NextResponse.json({ error: "No orders found" }, { status: 404 });
//     }

//     // Build pick list items with route optimization
//     const pickListItems = [];
//     let sequence = 1;

//     for (const order of orders) {
//       for (const item of order.items) {
//         const inventory = item.productVariant.inventory[0];
//         if (!inventory) {
//           console.warn(
//             `No inventory found for product variant ${item.productVariantId}`
//           );
//           continue;
//         }

//         pickListItems.push({
//           orderId: order.id,
//           productVariantId: item.productVariantId,
//           locationId: inventory.locationId,
//           quantityToPick: item.quantity,
//           pickSequence: sequence++,
//         });
//       }
//     }

//     if (pickListItems.length === 0) {
//       return NextResponse.json(
//         { error: "No items available to pick" },
//         { status: 400 }
//       );
//     }

//     // Generate batch number
//     const batchNumber = `WAVE-${Date.now().toString().slice(-6)}`;

//     const pickList = await prisma.pickList.create({
//       data: {
//         batchNumber,
//         assignedTo,
//         priority: priority || 0,
//         totalItems: pickListItems.length,
//         status: "ASSIGNED",
//         items: {
//           create: pickListItems,
//         },
//       },
//       include: {
//         items: {
//           include: {
//             productVariant: { include: { product: true } },
//             location: true,
//           },
//         },
//       },
//     });

//     // Update order statuses
//     await prisma.order.updateMany({
//       where: { id: { in: orderIds } },
//       data: {
//         status: "PICKING",
//         pickingAssignedTo: assignedTo,
//         pickingAssignedAt: new Date(),
//       },
//     });

//     console.log(
//       `✅ Pick list ${batchNumber} created with ${pickListItems.length} items`
//     );

//     // ========================================
//     // 🔔 SEND NOTIFICATION TO ASSIGNED PICKER
//     // ========================================
//     try {
//       const { notifyUser } = await import("@/lib/ably-server");

//       await notifyUser(assignedTo, {
//         type: "PICK_LIST_ASSIGNED",
//         title: "New Pick List Assigned",
//         message: `You have been assigned to pick ${pickListItems.length} item${
//           pickListItems.length > 1 ? "s" : ""
//         } from ${orders.length} order${
//           orders.length > 1 ? "s" : ""
//         } (${batchNumber})`,
//         // link: `/pick-lists/${pickList.id}`,
//         link: `/dashboard/picking/mobile/${pickList.id}`,
//         metadata: {
//           batchNumber: batchNumber,
//           totalItems: pickListItems.length,
//           totalOrders: orders.length,
//           priority: priority || 0,
//         },
//       });

//       console.log(`✅ Notification sent to picker ${assignedTo}`);
//     } catch (notificationError) {
//       console.error("Failed to send notification:", notificationError);
//       // Don't fail the entire request if notification fails
//     }

//     return NextResponse.json(pickList, { status: 201 });
//   } catch (error) {
//     console.error("Error creating pick list:", error);
//     return NextResponse.json(
//       { error: "Failed to create pick list", details: error.message },
//       { status: 500 }
//     );
//   }
// }
