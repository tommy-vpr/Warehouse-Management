// app/api/inventory/receive/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface ReceiveItem {
  productVariant: {
    id: string;
    sku: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
  };
  quantityReceived: number;
  transactionType: string;
  notes?: string;
}

// ✅ Add type for results
interface ReceiveResult {
  productVariant: {
    id: string;
    sku: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
  };
  quantityReceived: number;
  newQuantityOnHand: number;
}

// ✅ Add type for affected back orders
interface AffectedBackOrder {
  orderId: string;
  orderNumber: string;
  productSku: string;
  productName: string;
  quantityNeeded: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items }: { items: ReceiveItem[] } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items to receive" },
        { status: 400 }
      );
    }

    // Process all items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const results: ReceiveResult[] = []; // ✅ Explicit type
      const affectedBackOrders: AffectedBackOrder[] = []; // ✅ Explicit type

      for (const item of items) {
        // 1. Update or create inventory
        const inventory = await tx.inventory.upsert({
          where: {
            productVariantId_locationId: {
              productVariantId: item.productVariant.id,
              locationId: item.location.id,
            },
          },
          update: {
            quantityOnHand: {
              increment: item.quantityReceived,
            },
          },
          create: {
            productVariantId: item.productVariant.id,
            locationId: item.location.id,
            quantityOnHand: item.quantityReceived,
            quantityReserved: 0,
          },
        });

        // 2. Create inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            productVariantId: item.productVariant.id,
            locationId: item.location.id,
            transactionType: item.transactionType as any,
            quantityChange: item.quantityReceived,
            userId: session.user.id,
            notes: item.notes || `Received ${item.quantityReceived} units`,
          },
        });

        // ✅ 3. Check for pending back orders for this product (for notification only)
        const pendingBackOrders = await tx.backOrder.findMany({
          where: {
            productVariantId: item.productVariant.id,
            status: "PENDING",
          },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
              },
            },
          },
        });

        // ✅ 4. If there are pending back orders, notify user but DON'T auto-fulfill
        if (pendingBackOrders.length > 0) {
          for (const backOrder of pendingBackOrders) {
            affectedBackOrders.push({
              orderId: backOrder.orderId,
              orderNumber: backOrder.order.orderNumber,
              productSku: item.productVariant.sku,
              productName: item.productVariant.name,
              quantityNeeded:
                backOrder.quantityBackOrdered - backOrder.quantityFulfilled,
            });
          }
        }

        results.push({
          productVariant: item.productVariant,
          location: item.location,
          quantityReceived: item.quantityReceived,
          newQuantityOnHand: inventory.quantityOnHand,
        });
      }

      // ✅ 5. Create notifications for affected back orders (but don't auto-fulfill)
      // ✅ 5. Create notifications for affected back orders (but don't auto-fulfill)
      if (affectedBackOrders.length > 0) {
        // Define the type for order groups
        type OrderGroup = {
          orderNumber: string;
          items: Array<{
            sku: string;
            name: string;
            quantityNeeded: number;
          }>;
        };

        // Group by order
        const orderGroups = affectedBackOrders.reduce<
          Record<string, OrderGroup>
        >((acc, bo) => {
          if (!acc[bo.orderId]) {
            acc[bo.orderId] = {
              orderNumber: bo.orderNumber,
              items: [],
            };
          }
          acc[bo.orderId].items.push({
            sku: bo.productSku,
            name: bo.productName,
            quantityNeeded: bo.quantityNeeded,
          });
          return acc;
        }, {});

        // Create notification for each affected order
        for (const [orderId, data] of Object.entries(orderGroups)) {
          await tx.notification.create({
            data: {
              userId: session.user.id,
              type: "BACKORDER_INVENTORY_AVAILABLE",
              title: "Inventory Received for Back Order",
              message: `New inventory received for back-ordered items in ${data.orderNumber}. Go to Back Orders dashboard to allocate.`,
              link: `/dashboard/backorders`,
              metadata: {
                orderId,
                orderNumber: data.orderNumber,
                items: data.items,
              },
            },
          });
        }
      }

      return {
        results,
        affectedBackOrders,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully received ${result.results.length} item(s)${
        result.affectedBackOrders.length > 0
          ? `. ${result.affectedBackOrders.length} back order(s) can now be allocated.`
          : ""
      }`,
      results: result.results,
      affectedBackOrders: result.affectedBackOrders,
    });
  } catch (error) {
    console.error("Error receiving items:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to receive items",
      },
      { status: 500 }
    );
  }
}
// // app/api/inventory/receive/batch/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";

// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const body = await request.json();
//     const { items, poNumber, userId } = body;

//     const results = await prisma.$transaction(async (tx) => {
//       const results = [];

//       for (const item of items) {
//         // Update or create inventory record
//         const inventory = await tx.inventory.upsert({
//           where: {
//             productVariantId_locationId: {
//               productVariantId: item.productVariant.id,
//               locationId: item.location.id,
//             },
//           },
//           update: {
//             quantityOnHand: {
//               increment: item.quantityReceived,
//             },
//             updatedAt: new Date(),
//           },
//           create: {
//             productVariantId: item.productVariant.id,
//             locationId: item.location.id,
//             quantityOnHand: item.quantityReceived,
//             quantityReserved: 0,
//           },
//         });

//         // Create inventory transaction record
//         await tx.inventoryTransaction.create({
//           data: {
//             productVariantId: item.productVariant.id,
//             locationId: item.location.id,
//             transactionType: "RECEIPT",
//             quantityChange: item.quantityReceived,
//             referenceId: poNumber,
//             referenceType: "PURCHASE_ORDER",
//             userId: session.user.id,
//             notes: item.notes,
//           },
//         });

//         results.push({
//           productVariantId: item.productVariant.id,
//           locationId: item.location.id,
//           quantityReceived: item.quantityReceived,
//           newQuantityOnHand: inventory.quantityOnHand,
//         });
//       }

//       return results;
//     });

//     return NextResponse.json({
//       success: true,
//       message: `Successfully received ${items.length} items`,
//       results,
//     });
//   } catch (error) {
//     console.error("Batch receive error:", error);
//     return NextResponse.json(
//       { error: "Failed to receive inventory" },
//       { status: 500 }
//     );
//   }
// }
