// app/api/inventory/receive-po/approve/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only ADMIN or MANAGER can approve
    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Forbidden - Only ADMIN or MANAGER can approve receiving" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sessionId, action, reason } = body; // action: "APPROVE" | "REJECT"

    // ===== REJECTION FLOW =====
    if (action === "REJECT") {
      const rejectedSession = await prisma.receivingSession.update({
        where: { id: sessionId },
        data: {
          status: "REJECTED",
          approvedBy: session.user.id,
          approvedAt: new Date(),
          rejectionReason: reason || "Rejected by approver",
        },
      });

      // 🔔 TODO: Send notification to counter
      // await notifyUser(rejectedSession.countedBy, {
      //   type: "RECEIVING_REJECTED",
      //   message: `Your receiving session for PO ${rejectedSession.poReference} was rejected`,
      //   reason: reason
      // });

      return NextResponse.json({
        success: true,
        message: "Receiving session rejected",
        session: rejectedSession,
      });
    }

    // ===== APPROVAL FLOW =====

    // 1️⃣ Get receiving session with all details
    const receivingSession = await prisma.receivingSession.findUnique({
      where: { id: sessionId },
      include: {
        lineItems: true,
      },
    });

    if (!receivingSession) {
      return NextResponse.json(
        { error: "Receiving session not found" },
        { status: 404 }
      );
    }

    // 2️⃣ Prevent duplicate processing
    if (receivingSession.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "Receiving session already processed",
          status: receivingSession.status,
        },
        { status: 400 }
      );
    }

    // 3️⃣ Get or create receiving location
    let receivingLocation = await prisma.location.findFirst({
      where: { type: "RECEIVING" },
    });

    if (!receivingLocation) {
      receivingLocation = await prisma.location.findFirst({
        where: { type: "STORAGE" },
      });
    }

    if (!receivingLocation) {
      return NextResponse.json(
        { error: "No receiving location found" },
        { status: 400 }
      );
    }

    // 4️⃣ Process each line item and collect results
    let itemsReceived = 0;
    let unitsReceived = 0;
    const results = [];
    const skusNotFound = [];
    const backordersToCheck = new Set<string>(); // SKUs with backorders

    for (const line of receivingSession.lineItems) {
      if (line.quantityCounted <= 0) continue;

      // Find product variant by SKU
      const variant = await prisma.productVariant.findUnique({
        where: { sku: line.sku.trim() },
      });

      if (!variant) {
        console.warn(`⚠️ SKU ${line.sku} not found in system`);
        skusNotFound.push(line.sku);
        continue;
      }

      // 5️⃣ Update inventory
      const inventory = await prisma.inventory.upsert({
        where: {
          productVariantId_locationId: {
            productVariantId: variant.id,
            locationId: receivingLocation.id,
          },
        },
        update: {
          quantityOnHand: {
            increment: line.quantityCounted,
          },
        },
        create: {
          productVariantId: variant.id,
          locationId: receivingLocation.id,
          quantityOnHand: line.quantityCounted,
          quantityReserved: 0,
        },
      });

      // 6️⃣ Create transaction record with enhanced metadata
      await prisma.inventoryTransaction.create({
        data: {
          productVariantId: variant.id,
          locationId: receivingLocation.id,
          transactionType: "PO_RECEIVING",
          quantityChange: line.quantityCounted,
          referenceType: "PURCHASE_ORDER",
          referenceId: receivingSession.poId,
          userId: session.user.id,
          notes: `Approved receiving from PO ${receivingSession.poReference} (${receivingSession.vendor}). Counted by: ${receivingSession.countedBy}`,
          metadata: {
            sessionId: receivingSession.id,
            poId: receivingSession.poId,
            poReference: receivingSession.poReference,
            vendor: receivingSession.vendor,
            receivedQuantity: line.quantityCounted,
            expectedQuantity: line.quantityExpected,
            variance: line.variance,
            variancePercentage: line.quantityExpected
              ? (((line.variance || 0) / line.quantityExpected) * 100).toFixed(
                  2
                )
              : null,
            countedBy: receivingSession.countedBy,
            approvedBy: session.user.id,
            approvedAt: new Date().toISOString(),
            locationName: receivingLocation.name,
          },
        },
      });

      // Track for backorder fulfillment check
      backordersToCheck.add(variant.id);

      itemsReceived += 1;
      unitsReceived += line.quantityCounted;
      results.push({
        sku: line.sku,
        productName: line.productName,
        quantity: line.quantityCounted,
        variance: line.variance,
        variantId: variant.id,
        inventoryId: inventory.id,
      });
    }

    // 7️⃣ Update receiving session status
    await prisma.receivingSession.update({
      where: { id: sessionId },
      data: {
        status: "APPROVED",
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    // 8️⃣ Check for backorders that can now be fulfilled
    const backordersFulfilled = [];
    if (backordersToCheck.size > 0) {
      const pendingBackorders = await prisma.backOrder.findMany({
        where: {
          productVariantId: { in: Array.from(backordersToCheck) },
          status: "PENDING",
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
            },
          },
          productVariant: {
            select: {
              sku: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc", // FIFO - oldest backorders first
        },
      });

      // For each backorder, try to allocate from newly received inventory
      for (const backorder of pendingBackorders) {
        const availableInventory = await prisma.inventory.findFirst({
          where: {
            productVariantId: backorder.productVariantId,
            locationId: receivingLocation.id,
          },
        });

        if (availableInventory) {
          const availableQty =
            availableInventory.quantityOnHand -
            availableInventory.quantityReserved;
          const qtyNeeded =
            backorder.quantityBackOrdered - backorder.quantityFulfilled;

          if (availableQty >= qtyNeeded) {
            // Full backorder can be fulfilled
            await prisma.backOrder.update({
              where: { id: backorder.id },
              data: {
                status: "ALLOCATED",
                quantityFulfilled: backorder.quantityBackOrdered,
              },
            });

            // Reserve the inventory
            await prisma.inventory.update({
              where: { id: availableInventory.id },
              data: {
                quantityReserved: {
                  increment: qtyNeeded,
                },
              },
            });

            backordersFulfilled.push({
              orderNumber: backorder.order.orderNumber,
              sku: backorder.productVariant.sku,
              quantity: qtyNeeded,
            });
          }
        }
      }
    }

    // 9️⃣ Create notifications
    // Notify the counter that their session was approved
    await prisma.notification.create({
      data: {
        userId: receivingSession.countedBy,
        type: "RECEIVING_APPROVED",
        title: "✅ Receiving Approved",
        message: `Your receiving session for PO ${receivingSession.poReference} has been approved by ${session.user.name}`,
        link: `/dashboard/inventory/transactions?poId=${receivingSession.poId}`,
        metadata: {
          sessionId: receivingSession.id,
          poReference: receivingSession.poReference,
          itemsReceived,
          unitsReceived,
        },
      },
    });

    // If backorders were fulfilled, notify relevant parties
    if (backordersFulfilled.length > 0) {
      // Get unique order IDs from fulfilled backorders
      const fulfilledOrders = [
        ...new Set(backordersFulfilled.map((bo) => bo.orderNumber)),
      ];

      // TODO: Notify picking team or create pick tasks
      // TODO: Notify customer service about backorder fulfillment
    }

    // 🔟 Prepare comprehensive response
    const response = {
      success: true,
      message: `Successfully received ${unitsReceived} units (${itemsReceived} SKUs) from PO ${receivingSession.poReference}`,
      summary: {
        itemsReceived,
        unitsReceived,
        location: receivingLocation.name,
        poReference: receivingSession.poReference,
        vendor: receivingSession.vendor,
        countedBy: receivingSession.countedBy,
        approvedBy: session.user.id,
        approvedAt: new Date().toISOString(),
      },
      results,
      warnings:
        skusNotFound.length > 0
          ? {
              message: `${skusNotFound.length} SKU(s) not found in system`,
              skus: skusNotFound,
            }
          : null,
      backorders:
        backordersFulfilled.length > 0
          ? {
              message: `${backordersFulfilled.length} backorder(s) can now be fulfilled`,
              details: backordersFulfilled,
            }
          : null,
    };

    console.log("✅ PO Receiving Approved:", response.summary);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("❌ Failed to approve receiving:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

// // app/api/inventory/receive-po/approve/route.ts
// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";

// export async function POST(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Check role - only ADMIN or MANAGER can approve
//     if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
//       return NextResponse.json(
//         { error: "Forbidden - Only ADMIN or MANAGER can approve receiving" },
//         { status: 403 }
//       );
//     }

//     const body = await request.json();
//     const { sessionId, action } = body; // action: "APPROVE" | "REJECT"

//     if (action === "REJECT") {
//       // Just mark as rejected
//       const rejectedSession = await prisma.receivingSession.update({
//         where: { id: sessionId },
//         data: {
//           status: "REJECTED",
//           approvedBy: session.user.id,
//           approvedAt: new Date(),
//           rejectionReason: body.reason || "Rejected by approver",
//         },
//       });

//       return NextResponse.json({
//         success: true,
//         message: "Receiving session rejected",
//         session: rejectedSession,
//       });
//     }

//     // APPROVE - Process the receiving
//     const receivingSession = await prisma.receivingSession.findUnique({
//       where: { id: sessionId },
//       include: {
//         lineItems: true,
//       },
//     });

//     if (!receivingSession) {
//       return NextResponse.json(
//         { error: "Receiving session not found" },
//         { status: 404 }
//       );
//     }

//     if (receivingSession.status !== "PENDING") {
//       return NextResponse.json(
//         { error: "Receiving session already processed" },
//         { status: 400 }
//       );
//     }

//     // Get default receiving location
//     let receivingLocation = await prisma.location.findFirst({
//       where: { type: "RECEIVING" },
//     });

//     if (!receivingLocation) {
//       receivingLocation = await prisma.location.findFirst({
//         where: { type: "STORAGE" },
//       });
//     }

//     if (!receivingLocation) {
//       return NextResponse.json(
//         { error: "No receiving location found" },
//         { status: 400 }
//       );
//     }

//     let itemsReceived = 0;
//     const results = [];

//     // Process each line item
//     for (const line of receivingSession.lineItems) {
//       if (line.quantityCounted <= 0) continue;

//       // Find product variant by SKU
//       const variant = await prisma.productVariant.findUnique({
//         where: { sku: line.sku },
//       });

//       if (!variant) {
//         console.warn(`SKU ${line.sku} not found in system`);
//         continue;
//       }

//       // Create or update inventory
//       const inventory = await prisma.inventory.upsert({
//         where: {
//           productVariantId_locationId: {
//             productVariantId: variant.id,
//             locationId: receivingLocation.id,
//           },
//         },
//         update: {
//           quantityOnHand: {
//             increment: line.quantityCounted,
//           },
//         },
//         create: {
//           productVariantId: variant.id,
//           locationId: receivingLocation.id,
//           quantityOnHand: line.quantityCounted,
//           quantityReserved: 0,
//         },
//       });

//       // Create transaction record
//       await prisma.inventoryTransaction.create({
//         data: {
//           productVariantId: variant.id,
//           locationId: receivingLocation.id,
//           transactionType: "PO_RECEIVING",
//           quantityChange: line.quantityCounted,
//           referenceType: "PURCHASE_ORDER",
//           referenceId: receivingSession.poId,
//           userId: session.user.id,
//           notes: `Approved receiving from PO ${receivingSession.poReference} (${receivingSession.vendor}). Counted by: ${receivingSession.countedBy}`,
//           metadata: {
//             sessionId: receivingSession.id,
//             poId: receivingSession.poId,
//             poReference: receivingSession.poReference,
//             vendor: receivingSession.vendor,
//             receivedQuantity: line.quantityCounted,
//             expectedQuantity: line.quantityExpected,
//             variance: line.variance,
//             countedBy: receivingSession.countedBy,
//             approvedBy: session.user.id,
//           },
//         },
//       });

//       itemsReceived += line.quantityCounted;
//       results.push({
//         sku: line.sku,
//         quantity: line.quantityCounted,
//         variantId: variant.id,
//         inventoryId: inventory.id,
//       });
//     }

//     // Update session status
//     await prisma.receivingSession.update({
//       where: { id: sessionId },
//       data: {
//         status: "APPROVED",
//         approvedBy: session.user.id,
//         approvedAt: new Date(),
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       itemsReceived,
//       results,
//       message: `Successfully received ${itemsReceived} units from PO ${receivingSession.poReference}`,
//     });
//   } catch (error: any) {
//     console.error("❌ Failed to approve receiving:", error);
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }
