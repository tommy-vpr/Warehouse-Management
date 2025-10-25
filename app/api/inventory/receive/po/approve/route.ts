// app/api/inventory/receive-po/approve/route.ts
// ADAPTED FOR YOUR EXISTING WORKTASK SYSTEM
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Ably from "ably";

// Type for BackOrder with included relations
type BackOrderWithRelations = Prisma.BackOrderGetPayload<{
  include: {
    order: {
      select: {
        id: true;
        orderNumber: true;
        customerName: true;
        customerEmail: true;
        status: true;
      };
    };
    productVariant: {
      select: {
        id: true;
        sku: true;
        name: true;
      };
    };
  };
}>;

// Initialize Ably for real-time notifications
const ably = new Ably.Rest(process.env.ABLY_API_KEY || "");

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
    const { sessionId, action, reason } = body;

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

      // Send notification to counter
      try {
        await prisma.notification.create({
          data: {
            userId: rejectedSession.countedBy,
            type: "RECEIVING_REJECTED",
            title: "❌ Receiving Rejected",
            message: `Your receiving session for PO ${rejectedSession.poReference} was rejected`,
            metadata: {
              sessionId: rejectedSession.id,
              poReference: rejectedSession.poReference,
              reason: reason || "Rejected by approver",
            },
          },
        });

        // Publish to Ably
        const channel = ably.channels.get(`user:${rejectedSession.countedBy}`);
        await channel.publish("notification", {
          type: "RECEIVING_REJECTED",
          title: "❌ Receiving Rejected",
          message: `PO ${rejectedSession.poReference} was rejected`,
        });
      } catch (notifError) {
        console.error("⚠️ Failed to send rejection notification:", notifError);
      }

      return NextResponse.json({
        success: true,
        message: "Receiving session rejected",
        session: rejectedSession,
      });
    }

    // ===== APPROVAL FLOW =====
    // Wrap entire approval in transaction for atomicity
    const result = await prisma.$transaction(
      async (tx) => {
        // 1️⃣ Get receiving session with all details
        const receivingSession = await tx.receivingSession.findUnique({
          where: { id: sessionId },
          include: {
            lineItems: true,
          },
        });

        if (!receivingSession) {
          throw new Error("Receiving session not found");
        }

        // 2️⃣ Prevent duplicate processing
        if (receivingSession.status !== "PENDING") {
          throw new Error(
            `Receiving session already processed with status: ${receivingSession.status}`
          );
        }

        // 3️⃣ Get or create receiving location
        let receivingLocation = await tx.location.findFirst({
          where: { type: "RECEIVING" },
        });

        if (!receivingLocation) {
          receivingLocation = await tx.location.findFirst({
            where: { type: "STORAGE" },
          });
        }

        if (!receivingLocation) {
          throw new Error("No receiving location found");
        }

        // 4️⃣ Process each line item
        let itemsReceived = 0;
        let unitsReceived = 0;
        const results = [];
        const skusNotFound = [];
        const backordersToCheck = new Set<string>(); // Variant IDs with new inventory

        for (const line of receivingSession.lineItems) {
          if (line.quantityCounted <= 0) continue;

          // Find product variant by SKU (trim whitespace)
          const variant = await tx.productVariant.findUnique({
            where: { sku: line.sku.trim() },
          });

          if (!variant) {
            console.warn(`⚠️ SKU ${line.sku} not found in system`);
            skusNotFound.push(line.sku);
            continue;
          }

          // 5️⃣ Update inventory
          const inventory = await tx.inventory.upsert({
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

          // 6️⃣ Create transaction record
          await tx.inventoryTransaction.create({
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
                  ? (
                      ((line.variance || 0) / line.quantityExpected) *
                      100
                    ).toFixed(2)
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
        await tx.receivingSession.update({
          where: { id: sessionId },
          data: {
            status: "APPROVED",
            approvedBy: session.user.id,
            approvedAt: new Date(),
          },
        });

        // 8️⃣ AUTO-FULFILL BACKORDERS
        const backordersFulfilled: Array<{
          backorderId: string;
          orderId: string;
          orderNumber: string;
          sku: string;
          productName: string;
          quantityFulfilled: number;
          isPartial: boolean;
          customerName: string;
          customerEmail?: string;
        }> = [];

        const ordersNeedingPicks = new Map<
          string,
          {
            orderId: string;
            orderNumber: string;
            customerName: string;
            customerEmail?: string;
            items: Array<{
              backorderId: string;
              variantId: string;
              sku: string;
              productName: string;
              quantity: number;
            }>;
          }
        >();

        if (backordersToCheck.size > 0) {
          // Find all pending backorders for newly received inventory
          const pendingBackorders: BackOrderWithRelations[] =
            await tx.backOrder.findMany({
              where: {
                productVariantId: { in: Array.from(backordersToCheck) },
                status: "PENDING",
              },
              include: {
                order: {
                  select: {
                    id: true,
                    orderNumber: true,
                    customerName: true,
                    customerEmail: true,
                    status: true,
                  },
                },
                productVariant: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc", // FIFO - oldest backorders first
              },
            });

          // Track reservations in-memory to prevent double-allocation
          const reservationUpdates = new Map<string, number>();

          for (const backorder of pendingBackorders) {
            const availableInventory = await tx.inventory.findFirst({
              where: {
                productVariantId: backorder.productVariantId,
                locationId: receivingLocation.id,
              },
            });

            if (!availableInventory) continue;

            // Calculate truly available quantity (accounting for in-flight reservations)
            const pendingReservation =
              reservationUpdates.get(availableInventory.id) || 0;
            const availableQty =
              availableInventory.quantityOnHand -
              availableInventory.quantityReserved -
              pendingReservation;

            const qtyNeeded =
              backorder.quantityBackOrdered - backorder.quantityFulfilled;

            if (availableQty <= 0) continue; // No inventory available

            // Determine fulfillment type
            const isFull = availableQty >= qtyNeeded;
            const qtyToAllocate = isFull ? qtyNeeded : availableQty;

            // Update backorder status
            await tx.backOrder.update({
              where: { id: backorder.id },
              data: {
                status: isFull ? "ALLOCATED" : "PARTIAL",
                quantityFulfilled: {
                  increment: qtyToAllocate,
                },
              },
            });

            // Reserve the inventory
            await tx.inventory.update({
              where: { id: availableInventory.id },
              data: {
                quantityReserved: {
                  increment: qtyToAllocate,
                },
              },
            });

            // Track this reservation for next iteration
            reservationUpdates.set(
              availableInventory.id,
              pendingReservation + qtyToAllocate
            );

            // Record fulfillment
            backordersFulfilled.push({
              backorderId: backorder.id,
              orderId: backorder.orderId,
              orderNumber: backorder.order.orderNumber,
              sku: backorder.productVariant.sku,
              productName: backorder.productVariant.name,
              quantityFulfilled: qtyToAllocate,
              isPartial: !isFull,
              customerName: backorder.order.customerName,
              customerEmail: backorder.order.customerEmail || undefined,
            });

            // Group by order for WorkTask creation
            if (!ordersNeedingPicks.has(backorder.orderId)) {
              ordersNeedingPicks.set(backorder.orderId, {
                orderId: backorder.orderId,
                orderNumber: backorder.order.orderNumber,
                customerName: backorder.order.customerName,
                customerEmail: backorder.order.customerEmail || undefined,
                items: [],
              });
            }

            ordersNeedingPicks.get(backorder.orderId)!.items.push({
              backorderId: backorder.id,
              variantId: backorder.productVariantId,
              sku: backorder.productVariant.sku,
              productName: backorder.productVariant.name,
              quantity: qtyToAllocate,
            });
          }
        }

        // 9️⃣ CREATE WORKTASKS FOR FULFILLED BACKORDERS (Using your existing WorkTask system)
        const workTasksCreated = [];

        for (const orderData of ordersNeedingPicks.values()) {
          // Check if order already has an active PICKING task
          const existingTask = await tx.workTask.findFirst({
            where: {
              type: "PICKING",
              status: {
                in: ["PENDING", "ASSIGNED", "IN_PROGRESS"],
              },
              orderIds: {
                has: orderData.orderId,
              },
            },
          });

          if (existingTask) {
            // Add items to existing task
            let sequence = await tx.taskItem.count({
              where: { taskId: existingTask.id },
            });

            for (const item of orderData.items) {
              await tx.taskItem.create({
                data: {
                  taskId: existingTask.id,
                  orderId: orderData.orderId,
                  productVariantId: item.variantId,
                  locationId: receivingLocation.id,
                  quantityRequired: item.quantity,
                  quantityCompleted: 0,
                  status: "PENDING",
                  sequence: sequence++,
                  notes: `Backorder fulfilled from PO ${receivingSession.poReference}`,
                },
              });
            }

            // Update task totals
            await tx.workTask.update({
              where: { id: existingTask.id },
              data: {
                totalItems: {
                  increment: orderData.items.length,
                },
                priority: Math.max(existingTask.priority, 100), // Boost priority for backorders
              },
            });

            workTasksCreated.push({
              taskId: existingTask.id,
              taskNumber: existingTask.taskNumber,
              orderNumber: orderData.orderNumber,
              itemCount: orderData.items.length,
              isNew: false,
            });
          } else {
            // Create new WorkTask for picking
            const taskNumber = `PICK-BO-${Date.now()
              .toString(36)
              .toUpperCase()}`;

            const workTask = await tx.workTask.create({
              data: {
                taskNumber,
                type: "PICKING",
                status: "PENDING",
                orderIds: [orderData.orderId],
                totalOrders: 1,
                completedOrders: 0,
                totalItems: orderData.items.length,
                completedItems: 0,
                priority: 100, // High priority for backorders
                notes: `Backorder fulfillment from PO ${receivingSession.poReference}`,
              },
            });

            // Create TaskItems
            for (let i = 0; i < orderData.items.length; i++) {
              const item = orderData.items[i];
              await tx.taskItem.create({
                data: {
                  taskId: workTask.id,
                  orderId: orderData.orderId,
                  productVariantId: item.variantId,
                  locationId: receivingLocation.id,
                  quantityRequired: item.quantity,
                  quantityCompleted: 0,
                  status: "PENDING",
                  sequence: i,
                  notes: `Backorder fulfilled - ${item.productName}`,
                },
              });
            }

            // Create task event
            await tx.taskEvent.create({
              data: {
                taskId: workTask.id,
                eventType: "TASK_CREATED",
                userId: session.user.id,
                data: {
                  source: "backorder_fulfillment",
                  poReference: receivingSession.poReference,
                  orderNumber: orderData.orderNumber,
                },
                notes: `Auto-created for backorder fulfillment from PO ${receivingSession.poReference}`,
              },
            });

            workTasksCreated.push({
              taskId: workTask.id,
              taskNumber: workTask.taskNumber,
              orderNumber: orderData.orderNumber,
              itemCount: orderData.items.length,
              isNew: true,
            });
          }
        }

        // 🔟 CREATE NOTIFICATIONS
        // Notify the counter that their session was approved
        await tx.notification.create({
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

        // Notify picking team if backorders were fulfilled
        if (workTasksCreated.length > 0) {
          // Get all users with STAFF or ADMIN role who can pick
          const pickers = await tx.user.findMany({
            where: {
              role: {
                in: ["STAFF", "ADMIN"],
              },
            },
            select: {
              id: true,
            },
          });

          // Create notification for each picker
          for (const picker of pickers) {
            await tx.notification.create({
              data: {
                userId: picker.id,
                type: "BACKORDER_READY",
                title: "📦 Backorders Ready to Pick",
                message: `${workTasksCreated.length} backorder(s) fulfilled from PO ${receivingSession.poReference}`,
                link: `/dashboard/picking`,
                metadata: {
                  poReference: receivingSession.poReference,
                  workTasksCreated: workTasksCreated.length,
                  backordersFulfilled: backordersFulfilled.length,
                  taskNumbers: workTasksCreated.map((t) => t.taskNumber),
                },
              },
            });
          }
        }

        return {
          receivingSession,
          results,
          itemsReceived,
          unitsReceived,
          skusNotFound,
          backordersFulfilled,
          workTasksCreated,
          receivingLocationName: receivingLocation.name,
        };
      },
      {
        maxWait: 15000, // 15 seconds max wait
        timeout: 45000, // 45 seconds timeout
      }
    );

    // 1️⃣1️⃣ SEND REAL-TIME NOTIFICATIONS (outside transaction)
    try {
      // Notify counter via Ably
      const counterChannel = ably.channels.get(
        `user:${result.receivingSession.countedBy}`
      );
      await counterChannel.publish("notification", {
        type: "RECEIVING_APPROVED",
        title: "✅ Receiving Approved",
        message: `PO ${result.receivingSession.poReference} approved`,
      });

      // Notify picking team if backorders fulfilled
      if (result.workTasksCreated.length > 0) {
        const pickingChannel = ably.channels.get("warehouse:picking");
        await pickingChannel.publish("backorder-ready", {
          type: "BACKORDER_READY",
          poReference: result.receivingSession.poReference,
          workTasks: result.workTasksCreated.length,
          backorders: result.backordersFulfilled.length,
          taskNumbers: result.workTasksCreated.map((t) => t.taskNumber),
        });
      }
    } catch (ablyError) {
      console.error("⚠️ Failed to send Ably notifications:", ablyError);
      // Don't fail the request if Ably fails
    }

    // 1️⃣2️⃣ PREPARE RESPONSE
    const response = {
      success: true,
      message: `Successfully received ${result.unitsReceived} units (${result.itemsReceived} SKUs) from PO ${result.receivingSession.poReference}`,
      summary: {
        itemsReceived: result.itemsReceived,
        unitsReceived: result.unitsReceived,
        location: result.receivingLocationName,
        poReference: result.receivingSession.poReference,
        vendor: result.receivingSession.vendor,
        countedBy: result.receivingSession.countedBy,
        approvedBy: session.user.id,
        approvedAt: new Date().toISOString(),
      },
      results: result.results,
      warnings:
        result.skusNotFound.length > 0
          ? {
              message: `${result.skusNotFound.length} SKU(s) not found in system`,
              skus: result.skusNotFound,
            }
          : null,
      backorders:
        result.backordersFulfilled.length > 0
          ? {
              message: `${result.backordersFulfilled.length} backorder(s) fulfilled`,
              details: result.backordersFulfilled,
              workTasksCreated: result.workTasksCreated,
            }
          : null,
    };

    console.log("✅ PO Receiving Approved:", response.summary);
    if (result.backordersFulfilled.length > 0) {
      console.log(
        "📦 Backorders Fulfilled:",
        result.backordersFulfilled.length
      );
      console.log("✅ WorkTasks Created:", result.workTasksCreated.length);
      console.log(
        "Task Numbers:",
        result.workTasksCreated.map((t) => t.taskNumber).join(", ")
      );
    }

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
// // app/api/inventory/receive/approve/route.ts
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
//     const { sessionId, action, reason } = body; // action: "APPROVE" | "REJECT"

//     // ===== REJECTION FLOW =====
//     if (action === "REJECT") {
//       const rejectedSession = await prisma.receivingSession.update({
//         where: { id: sessionId },
//         data: {
//           status: "REJECTED",
//           approvedBy: session.user.id,
//           approvedAt: new Date(),
//           rejectionReason: reason || "Rejected by approver",
//         },
//       });

//       // 🔔 TODO: Send notification to counter
//       // await notifyUser(rejectedSession.countedBy, {
//       //   type: "RECEIVING_REJECTED",
//       //   message: `Your receiving session for PO ${rejectedSession.poReference} was rejected`,
//       //   reason: reason
//       // });

//       return NextResponse.json({
//         success: true,
//         message: "Receiving session rejected",
//         session: rejectedSession,
//       });
//     }

//     // ===== APPROVAL FLOW =====

//     // 1️⃣ Get receiving session with all details
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

//     // 2️⃣ Prevent duplicate processing
//     if (receivingSession.status !== "PENDING") {
//       return NextResponse.json(
//         {
//           error: "Receiving session already processed",
//           status: receivingSession.status,
//         },
//         { status: 400 }
//       );
//     }

//     // 3️⃣ Get or create receiving location
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

//     // 4️⃣ Process each line item and collect results
//     let itemsReceived = 0;
//     let unitsReceived = 0;
//     const results = [];
//     const skusNotFound = [];
//     const backordersToCheck = new Set<string>(); // SKUs with backorders

//     for (const line of receivingSession.lineItems) {
//       if (line.quantityCounted <= 0) continue;

//       // Find product variant by SKU
//       const variant = await prisma.productVariant.findUnique({
//         where: { sku: line.sku.trim() },
//       });

//       if (!variant) {
//         console.warn(`⚠️ SKU ${line.sku} not found in system`);
//         skusNotFound.push(line.sku);
//         continue;
//       }

//       // 5️⃣ Update inventory
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

//       // 6️⃣ Create transaction record with enhanced metadata
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
//             variancePercentage: line.quantityExpected
//               ? (((line.variance || 0) / line.quantityExpected) * 100).toFixed(
//                   2
//                 )
//               : null,
//             countedBy: receivingSession.countedBy,
//             approvedBy: session.user.id,
//             approvedAt: new Date().toISOString(),
//             locationName: receivingLocation.name,
//           },
//         },
//       });

//       // Track for backorder fulfillment check
//       backordersToCheck.add(variant.id);

//       itemsReceived += 1;
//       unitsReceived += line.quantityCounted;
//       results.push({
//         sku: line.sku,
//         productName: line.productName,
//         quantity: line.quantityCounted,
//         variance: line.variance,
//         variantId: variant.id,
//         inventoryId: inventory.id,
//       });
//     }

//     // 7️⃣ Update receiving session status
//     await prisma.receivingSession.update({
//       where: { id: sessionId },
//       data: {
//         status: "APPROVED",
//         approvedBy: session.user.id,
//         approvedAt: new Date(),
//       },
//     });

//     // 8️⃣ Check for backorders that can now be fulfilled
//     const backordersFulfilled = [];
//     if (backordersToCheck.size > 0) {
//       const pendingBackorders = await prisma.backOrder.findMany({
//         where: {
//           productVariantId: { in: Array.from(backordersToCheck) },
//           status: "PENDING",
//         },
//         include: {
//           order: {
//             select: {
//               orderNumber: true,
//               customerName: true,
//             },
//           },
//           productVariant: {
//             select: {
//               sku: true,
//               name: true,
//             },
//           },
//         },
//         orderBy: {
//           createdAt: "asc", // FIFO - oldest backorders first
//         },
//       });

//       // For each backorder, try to allocate from newly received inventory
//       for (const backorder of pendingBackorders) {
//         const availableInventory = await prisma.inventory.findFirst({
//           where: {
//             productVariantId: backorder.productVariantId,
//             locationId: receivingLocation.id,
//           },
//         });

//         if (availableInventory) {
//           const availableQty =
//             availableInventory.quantityOnHand -
//             availableInventory.quantityReserved;
//           const qtyNeeded =
//             backorder.quantityBackOrdered - backorder.quantityFulfilled;

//           if (availableQty >= qtyNeeded) {
//             // Full backorder can be fulfilled
//             await prisma.backOrder.update({
//               where: { id: backorder.id },
//               data: {
//                 status: "ALLOCATED",
//                 quantityFulfilled: backorder.quantityBackOrdered,
//               },
//             });

//             // Reserve the inventory
//             await prisma.inventory.update({
//               where: { id: availableInventory.id },
//               data: {
//                 quantityReserved: {
//                   increment: qtyNeeded,
//                 },
//               },
//             });

//             backordersFulfilled.push({
//               orderNumber: backorder.order.orderNumber,
//               sku: backorder.productVariant.sku,
//               quantity: qtyNeeded,
//             });
//           }
//         }
//       }
//     }

//     // 9️⃣ Create notifications
//     // Notify the counter that their session was approved
//     await prisma.notification.create({
//       data: {
//         userId: receivingSession.countedBy,
//         type: "RECEIVING_APPROVED",
//         title: "✅ Receiving Approved",
//         message: `Your receiving session for PO ${receivingSession.poReference} has been approved by ${session.user.name}`,
//         link: `/dashboard/inventory/transactions?poId=${receivingSession.poId}`,
//         metadata: {
//           sessionId: receivingSession.id,
//           poReference: receivingSession.poReference,
//           itemsReceived,
//           unitsReceived,
//         },
//       },
//     });

//     // If backorders were fulfilled, notify relevant parties
//     if (backordersFulfilled.length > 0) {
//       // Get unique order IDs from fulfilled backorders
//       const fulfilledOrders = [
//         ...new Set(backordersFulfilled.map((bo) => bo.orderNumber)),
//       ];

//       // TODO: Notify picking team or create pick tasks
//       // TODO: Notify customer service about backorder fulfillment
//     }

//     // 🔟 Prepare comprehensive response
//     const response = {
//       success: true,
//       message: `Successfully received ${unitsReceived} units (${itemsReceived} SKUs) from PO ${receivingSession.poReference}`,
//       summary: {
//         itemsReceived,
//         unitsReceived,
//         location: receivingLocation.name,
//         poReference: receivingSession.poReference,
//         vendor: receivingSession.vendor,
//         countedBy: receivingSession.countedBy,
//         approvedBy: session.user.id,
//         approvedAt: new Date().toISOString(),
//       },
//       results,
//       warnings:
//         skusNotFound.length > 0
//           ? {
//               message: `${skusNotFound.length} SKU(s) not found in system`,
//               skus: skusNotFound,
//             }
//           : null,
//       backorders:
//         backordersFulfilled.length > 0
//           ? {
//               message: `${backordersFulfilled.length} backorder(s) can now be fulfilled`,
//               details: backordersFulfilled,
//             }
//           : null,
//     };

//     console.log("✅ PO Receiving Approved:", response.summary);

//     return NextResponse.json(response);
//   } catch (error: any) {
//     console.error("❌ Failed to approve receiving:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message,
//         details: error.stack,
//       },
//       { status: 500 }
//     );
//   }
// }
