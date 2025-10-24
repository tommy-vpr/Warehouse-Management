// app/api/orders/[orderId]/audit-trail/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface AuditEvent {
  id: string;
  type: string;
  eventType?: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  notes?: string;
  metadata?: Record<string, any>;
  data?: Record<string, any>;
}

interface AuditTrailResponse {
  timeline: AuditEvent[];
  summary: {
    byCategory: {
      orderStatus: number;
      picking: number;
      packing: number;
      shipping: number;
      backOrders: number;
    };
    totalEvents: number;
  };
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const { searchParams } = new URL(req.url);

    // Optional query parameters
    const eventType = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "100");

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const timeline: AuditEvent[] = [];
    const summary = {
      byCategory: {
        orderStatus: 0,
        picking: 0,
        packing: 0,
        shipping: 0,
        backOrders: 0,
      },
      totalEvents: 0,
    };

    // Date filters
    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };

    // 1. Fetch order status changes
    if (!eventType || eventType === "ORDER_STATUS") {
      try {
        const statusHistory = await prisma.orderStatusHistory.findMany({
          where: {
            orderId,
            ...(Object.keys(dateFilter).length > 0 && {
              createdAt: dateFilter,
            }),
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        for (const status of statusHistory) {
          timeline.push({
            id: `status-${status.id}`,
            type: "ORDER_STATUS",
            timestamp: status.createdAt.toISOString(),
            user: status.user,
            notes: status.notes,
            metadata: {
              fromStatus: status.fromStatus,
              toStatus: status.toStatus,
            },
          });
        }
        summary.byCategory.orderStatus = statusHistory.length;
      } catch (error) {
        console.error("Error fetching status history:", error);
      }
    }

    // 2. Fetch picking events (from PickEvent table)
    if (!eventType || eventType === "PICKING") {
      try {
        // Get all pick lists for this order
        const pickListIds = await prisma.pickList.findMany({
          where: {
            items: {
              some: { orderId },
            },
          },
          select: { id: true, batchNumber: true },
        });

        const pickListIdArray = pickListIds.map((pl) => pl.id);

        if (pickListIdArray.length > 0) {
          // Fetch all pick events for these pick lists
          const pickEvents = await prisma.pickEvent.findMany({
            where: {
              pickListId: { in: pickListIdArray },
              ...(Object.keys(dateFilter).length > 0 && {
                createdAt: dateFilter,
              }),
            },
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
              fromUser: {
                select: { id: true, name: true, email: true },
              },
              toUser: {
                select: { id: true, name: true, email: true },
              },
              pickList: {
                select: { batchNumber: true, status: true },
              },
            },
            orderBy: { createdAt: "desc" },
          });

          // Transform pick events to audit events
          for (const event of pickEvents) {
            const metadata: any = {
              batchNumber: event.pickList.batchNumber,
            };

            // Add location info if present
            if (event.location) metadata.location = event.location;
            if (event.scannedCode) metadata.scannedCode = event.scannedCode;

            // Add reassignment info if present
            if (event.fromUser) {
              metadata.fromUserId = event.fromUser.id;
              metadata.fromUserName = event.fromUser.name;
            }
            if (event.toUser) {
              metadata.toUserId = event.toUser.id;
              metadata.toUserName = event.toUser.name;
            }

            // Add any additional data from the data JSON field
            if (event.data) {
              metadata.reassignmentReason = (event.data as any).reason;
              metadata.progress = (event.data as any).progress;
            }

            timeline.push({
              id: `pick-event-${event.id}`,
              type: "PICKING",
              eventType: event.eventType,
              timestamp: event.createdAt.toISOString(),
              user: event.user,
              notes: event.notes,
              metadata,
              data: event.data as Record<string, any>,
            });
          }

          summary.byCategory.picking = pickEvents.length;
        }
      } catch (error) {
        console.error("Error fetching pick events:", error);
      }
    }

    // 3. Fetch packing events (from TaskEvent table)
    if (!eventType || eventType === "PACKING") {
      try {
        // First, get all packing tasks for this order
        const packingTasks = await prisma.workTask.findMany({
          where: {
            type: "PACKING",
            orderIds: { has: orderId },
            ...(Object.keys(dateFilter).length > 0 && {
              createdAt: dateFilter,
            }),
          },
          select: { id: true, taskNumber: true },
        });

        const taskIdArray = packingTasks.map((t) => t.id);

        if (taskIdArray.length > 0) {
          // Fetch TaskEvent records for these packing tasks
          const taskEvents = await prisma.taskEvent.findMany({
            where: {
              taskId: { in: taskIdArray },
              ...(Object.keys(dateFilter).length > 0 && {
                createdAt: dateFilter,
              }),
            },
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
              task: {
                select: {
                  taskNumber: true,
                  status: true,
                  totalOrders: true,
                  completedOrders: true,
                  totalItems: true,
                  completedItems: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          });

          // Transform task events to audit events
          for (const event of taskEvents) {
            const metadata: any = {
              taskNumber: event.task.taskNumber,
            };

            // Add reassignment info if present
            if (event.data) {
              const eventData = event.data as any;

              if (eventData.fromUserId)
                metadata.fromUserId = eventData.fromUserId;
              if (eventData.fromUserName)
                metadata.fromUserName = eventData.fromUserName;
              if (eventData.toUserId) metadata.toUserId = eventData.toUserId;
              if (eventData.toUserName)
                metadata.toUserName = eventData.toUserName;
              if (eventData.reason)
                metadata.reassignmentReason = eventData.reason;

              // Add progress info
              if (eventData.progress) {
                metadata.progress = eventData.progress;
              } else {
                // Use task-level progress
                metadata.progress = {
                  completedItems: event.task.completedItems,
                  totalItems: event.task.totalItems,
                  completedOrders: event.task.completedOrders,
                  totalOrders: event.task.totalOrders,
                };
              }
            }

            timeline.push({
              id: `task-event-${event.id}`,
              type: "PACKING",
              eventType: event.eventType,
              timestamp: event.createdAt.toISOString(),
              user: event.user,
              notes: event.notes,
              metadata,
              data: event.data as Record<string, any>,
            });
          }

          summary.byCategory.packing = taskEvents.length;
        }
      } catch (error) {
        console.error("Error fetching packing events:", error);
      }
    }

    // 4. Fetch shipping events
    // if (!eventType || eventType === "SHIPPING") {
    //   try {
    //     const packages = await prisma.shippingPackage.findMany({
    //       where: {
    //         orderId,
    //         ...(Object.keys(dateFilter).length > 0 && {
    //           createdAt: dateFilter,
    //         }),
    //       },
    //       include: {
    //         createdBy: {
    //           select: { id: true, name: true, email: true },
    //         },
    //         shippedBy: {
    //           select: { id: true, name: true, email: true },
    //         },
    //       },
    //       orderBy: { createdAt: "desc" },
    //     });

    //     for (const pkg of packages) {
    //       // Label created
    //       if (pkg.trackingNumber) {
    //         timeline.push({
    //           id: `label-${pkg.id}`,
    //           type: "SHIPPING",
    //           eventType: "LABEL_CREATED",
    //           timestamp: pkg.createdAt.toISOString(),
    //           user: pkg.createdBy,
    //           metadata: {
    //             trackingNumber: pkg.trackingNumber,
    //             carrier: pkg.carrier || "Unknown",
    //             service: pkg.serviceLevel || "Standard",
    //             weight: pkg.weight,
    //             cost: pkg.shippingCost,
    //           },
    //         });
    //       }

    //       // Package shipped
    //       if (pkg.shippedAt && pkg.shippedBy) {
    //         timeline.push({
    //           id: `shipped-${pkg.id}`,
    //           type: "SHIPPING",
    //           eventType: "PACKAGE_SHIPPED",
    //           timestamp: pkg.shippedAt.toISOString(),
    //           user: pkg.shippedBy,
    //           metadata: {
    //             trackingNumber: pkg.trackingNumber,
    //             carrier: pkg.carrier || "Unknown",
    //           },
    //         });
    //       }
    //     }
    //     summary.byCategory.shipping = packages.length;
    //   } catch (error) {
    //     console.error("Error fetching shipping packages:", error);
    //   }
    // }

    // 4. Fetch shipping TASK events (more detailed than just packages)
    if (!eventType || eventType === "SHIPPING") {
      try {
        // Get shipping tasks for this order
        const shippingTasks = await prisma.workTask.findMany({
          where: {
            type: "SHIPPING",
            orderIds: { has: orderId },
            ...(Object.keys(dateFilter).length > 0 && {
              createdAt: dateFilter,
            }),
          },
          select: { id: true, taskNumber: true },
        });

        const shippingTaskIds = shippingTasks.map((t) => t.id);

        if (shippingTaskIds.length > 0) {
          // Fetch all shipping task events
          const shippingTaskEvents = await prisma.taskEvent.findMany({
            where: {
              taskId: { in: shippingTaskIds },
              ...(Object.keys(dateFilter).length > 0 && {
                createdAt: dateFilter,
              }),
            },
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
              task: {
                select: {
                  taskNumber: true,
                  status: true,
                  totalOrders: true,
                  completedOrders: true,
                  totalItems: true,
                  completedItems: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          });

          // Transform shipping task events to audit events
          for (const event of shippingTaskEvents) {
            const metadata: any = {
              taskNumber: event.task.taskNumber,
            };

            // Parse event data
            if (event.data) {
              const eventData = event.data as any;

              // Reassignment info
              if (eventData.fromUserId)
                metadata.fromUserId = eventData.fromUserId;
              if (eventData.fromUserName)
                metadata.fromUserName = eventData.fromUserName;
              if (eventData.toUserId) metadata.toUserId = eventData.toUserId;
              if (eventData.toUserName)
                metadata.toUserName = eventData.toUserName;
              if (eventData.reason)
                metadata.reassignmentReason = eventData.reason;

              // Shipping-specific data
              if (eventData.trackingNumber)
                metadata.trackingNumber = eventData.trackingNumber;
              if (eventData.carrier) metadata.carrier = eventData.carrier;
              if (eventData.serviceLevel)
                metadata.serviceLevel = eventData.serviceLevel;
              if (eventData.weight) metadata.weight = eventData.weight;
              if (eventData.dimensions)
                metadata.dimensions = eventData.dimensions;
              if (eventData.shippingCost)
                metadata.shippingCost = eventData.shippingCost;
              if (eventData.insuranceAmount)
                metadata.insuranceAmount = eventData.insuranceAmount;
              if (eventData.rateQuotes)
                metadata.rateQuotes = eventData.rateQuotes;
              if (eventData.packageId) metadata.packageId = eventData.packageId;
              if (eventData.manifestId)
                metadata.manifestId = eventData.manifestId;
              if (eventData.pickupDate)
                metadata.pickupDate = eventData.pickupDate;
              if (eventData.voidReason)
                metadata.voidReason = eventData.voidReason;

              // Progress info
              if (eventData.progress) {
                metadata.progress = eventData.progress;
              } else {
                metadata.progress = {
                  completedItems: event.task.completedItems,
                  totalItems: event.task.totalItems,
                  completedOrders: event.task.completedOrders,
                  totalOrders: event.task.totalOrders,
                };
              }
            }

            timeline.push({
              id: `shipping-task-event-${event.id}`,
              type: "SHIPPING",
              eventType: event.eventType,
              timestamp: event.createdAt.toISOString(),
              user: event.user,
              notes: event.notes,
              metadata,
              data: event.data as Record<string, any>,
            });
          }

          summary.byCategory.shipping += shippingTaskEvents.length;
        }

        // Also fetch shipping packages (existing code - keep this too)
        const packages = await prisma.shippingPackage.findMany({
          where: {
            orderId,
            ...(Object.keys(dateFilter).length > 0 && {
              createdAt: dateFilter,
            }),
          },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            shippedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        for (const pkg of packages) {
          // Label created
          if (pkg.trackingNumber) {
            timeline.push({
              id: `label-${pkg.id}`,
              type: "SHIPPING",
              eventType: "LABEL_CREATED",
              timestamp: pkg.createdAt.toISOString(),
              user: pkg.createdBy,
              metadata: {
                trackingNumber: pkg.trackingNumber,
                carrier: pkg.carrier || "Unknown",
                service: pkg.serviceLevel || "Standard",
                weight: pkg.weight,
                cost: pkg.shippingCost,
                packageId: pkg.id,
              },
            });
          }

          // Package shipped
          if (pkg.shippedAt && pkg.shippedBy) {
            timeline.push({
              id: `shipped-${pkg.id}`,
              type: "SHIPPING",
              eventType: "PACKAGE_SHIPPED",
              timestamp: pkg.shippedAt.toISOString(),
              user: pkg.shippedBy,
              metadata: {
                trackingNumber: pkg.trackingNumber,
                carrier: pkg.carrier || "Unknown",
                packageId: pkg.id,
              },
            });
          }
        }

        summary.byCategory.shipping += packages.length * 2; // Each package has 2 events
      } catch (error) {
        console.error("Error fetching shipping events:", error);
      }
    }

    // 5. Fetch back order events
    if (!eventType || eventType === "BACK_ORDER") {
      try {
        const backOrders = await prisma.backOrder.findMany({
          where: {
            orderId,
            ...(Object.keys(dateFilter).length > 0 && {
              createdAt: dateFilter,
            }),
          },
          include: {
            item: {
              select: {
                sku: true,
                name: true,
              },
            },
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            fulfilledBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        for (const backOrder of backOrders) {
          // Back order created
          timeline.push({
            id: `backorder-created-${backOrder.id}`,
            type: "BACK_ORDER",
            eventType: "CREATED",
            timestamp: backOrder.createdAt.toISOString(),
            user: backOrder.createdBy,
            metadata: {
              quantity: backOrder.quantity,
              sku: backOrder.item.sku,
              itemName: backOrder.item.name,
              reason: backOrder.reason || "INSUFFICIENT_STOCK",
              expectedDate: backOrder.expectedRestockDate?.toISOString(),
            },
          });

          // Back order fulfilled
          if (backOrder.fulfilledAt && backOrder.fulfilledBy) {
            timeline.push({
              id: `backorder-fulfilled-${backOrder.id}`,
              type: "BACK_ORDER",
              eventType: "FULFILLED",
              timestamp: backOrder.fulfilledAt.toISOString(),
              user: backOrder.fulfilledBy,
              metadata: {
                quantity: backOrder.quantity,
                sku: backOrder.item.sku,
                itemName: backOrder.item.name,
              },
            });
          }
        }
        summary.byCategory.backOrders = backOrders.length;
      } catch (error) {
        console.error("Error fetching back orders:", error);
      }
    }

    // Sort timeline by timestamp (most recent first)
    timeline.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    summary.totalEvents = timeline.length;

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedTimeline = timeline.slice(startIndex, endIndex);

    const response: AuditTrailResponse = {
      timeline: paginatedTimeline,
      summary,
      pagination: {
        total: timeline.length,
        page,
        pageSize,
        hasMore: endIndex < timeline.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Audit trail error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch audit trail",
        message: error instanceof Error ? error.message : "Unknown error",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined,
      },
      { status: 500 }
    );
  }
}

// // app/api/orders/[orderId]/audit-trail/route.ts (Complete Updated Version)
// import { prisma } from "@/lib/prisma";
// import { NextRequest, NextResponse } from "next/server";

// interface AuditEvent {
//   id: string;
//   type: string;
//   eventType?: string;
//   timestamp: string;
//   user: {
//     id: string;
//     name: string;
//     email: string;
//   } | null;
//   notes?: string;
//   metadata?: Record<string, any>;
//   data?: Record<string, any>;
// }

// interface AuditTrailResponse {
//   timeline: AuditEvent[];
//   summary: {
//     byCategory: {
//       orderStatus: number;
//       picking: number;
//       packing: number;
//       shipping: number;
//       backOrders: number;
//     };
//     totalEvents: number;
//   };
//   pagination?: {
//     total: number;
//     page: number;
//     pageSize: number;
//     hasMore: boolean;
//   };
// }

// export async function GET(
//   req: NextRequest,
//   { params }: { params: Promise<{ orderId: string }> }
// ) {
//   try {
//     const { orderId } = await params;
//     const { searchParams } = new URL(req.url);

//     // Optional query parameters
//     const eventType = searchParams.get("type");
//     const startDate = searchParams.get("startDate");
//     const endDate = searchParams.get("endDate");
//     const page = parseInt(searchParams.get("page") || "1");
//     const pageSize = parseInt(searchParams.get("pageSize") || "100");

//     // Verify order exists
//     const order = await prisma.order.findUnique({
//       where: { id: orderId },
//       select: {
//         id: true,
//         orderNumber: true,
//         createdAt: true,
//       },
//     });

//     if (!order) {
//       return NextResponse.json({ error: "Order not found" }, { status: 404 });
//     }

//     const timeline: AuditEvent[] = [];
//     const summary = {
//       byCategory: {
//         orderStatus: 0,
//         picking: 0,
//         packing: 0,
//         shipping: 0,
//         backOrders: 0,
//       },
//       totalEvents: 0,
//     };

//     // Date filters
//     const dateFilter = {
//       ...(startDate && { gte: new Date(startDate) }),
//       ...(endDate && { lte: new Date(endDate) }),
//     };

//     // 1. Fetch order status changes
//     if (!eventType || eventType === "ORDER_STATUS") {
//       try {
//         const statusHistory = await prisma.orderStatusHistory.findMany({
//           where: {
//             orderId,
//             ...(Object.keys(dateFilter).length > 0 && {
//               createdAt: dateFilter,
//             }),
//           },
//           include: {
//             user: {
//               select: {
//                 id: true,
//                 name: true,
//                 email: true,
//               },
//             },
//           },
//           orderBy: { createdAt: "desc" },
//         });

//         for (const status of statusHistory) {
//           timeline.push({
//             id: `status-${status.id}`,
//             type: "ORDER_STATUS",
//             timestamp: status.createdAt.toISOString(),
//             user: status.user,
//             notes: status.notes,
//             metadata: {
//               fromStatus: status.fromStatus,
//               toStatus: status.toStatus,
//             },
//           });
//         }
//         summary.byCategory.orderStatus = statusHistory.length;
//       } catch (error) {
//         console.error("Error fetching status history:", error);
//       }
//     }

//     // 2. Fetch picking events (from PickEvent table)
//     if (!eventType || eventType === "PICKING") {
//       try {
//         // Get all pick lists for this order
//         const pickListIds = await prisma.pickList.findMany({
//           where: {
//             items: {
//               some: { orderId },
//             },
//           },
//           select: { id: true, batchNumber: true },
//         });

//         const pickListIdArray = pickListIds.map((pl) => pl.id);

//         if (pickListIdArray.length > 0) {
//           // Fetch all pick events for these pick lists
//           const pickEvents = await prisma.pickEvent.findMany({
//             where: {
//               pickListId: { in: pickListIdArray },
//               ...(Object.keys(dateFilter).length > 0 && {
//                 createdAt: dateFilter,
//               }),
//             },
//             include: {
//               user: {
//                 select: { id: true, name: true, email: true },
//               },
//               fromUser: {
//                 select: { id: true, name: true, email: true },
//               },
//               toUser: {
//                 select: { id: true, name: true, email: true },
//               },
//               pickList: {
//                 select: { batchNumber: true, status: true },
//               },
//             },
//             orderBy: { createdAt: "desc" },
//           });

//           // Transform pick events to audit events
//           for (const event of pickEvents) {
//             const metadata: any = {
//               batchNumber: event.pickList.batchNumber,
//             };

//             // Add location info if present
//             if (event.location) metadata.location = event.location;
//             if (event.scannedCode) metadata.scannedCode = event.scannedCode;

//             // Add reassignment info if present
//             if (event.fromUser) {
//               metadata.fromUserId = event.fromUser.id;
//               metadata.fromUserName = event.fromUser.name;
//             }
//             if (event.toUser) {
//               metadata.toUserId = event.toUser.id;
//               metadata.toUserName = event.toUser.name;
//             }

//             // Add any additional data from the data JSON field
//             if (event.data) {
//               metadata.reassignmentReason = (event.data as any).reason;
//               metadata.progress = (event.data as any).progress;
//             }

//             timeline.push({
//               id: `pick-event-${event.id}`,
//               type: "PICKING",
//               eventType: event.eventType,
//               timestamp: event.createdAt.toISOString(),
//               user: event.user,
//               notes: event.notes,
//               metadata,
//               data: event.data as Record<string, any>,
//             });
//           }

//           summary.byCategory.picking = pickEvents.length;
//         }
//       } catch (error) {
//         console.error("Error fetching pick events:", error);
//       }
//     }

//     // 3. Fetch packing events (from PackingEvent table if you have it, or WorkTask)
//     if (!eventType || eventType === "PACKING") {
//       try {
//         // First, get all packing tasks for this order
//         const packingTasks = await prisma.workTask.findMany({
//           where: {
//             type: "PACKING",
//             orderIds: { has: orderId },
//             ...(Object.keys(dateFilter).length > 0 && {
//               createdAt: dateFilter,
//             }),
//           },
//           select: { id: true, taskNumber: true },
//         });

//         const taskIdArray = packingTasks.map((t) => t.id);

//         if (taskIdArray.length > 0) {
//           // Check if PackingEvent table exists, otherwise fall back to WorkTask events
//           try {
//             const packingEvents = await prisma.packingEvent.findMany({
//               where: {
//                 taskId: { in: taskIdArray },
//                 ...(Object.keys(dateFilter).length > 0 && {
//                   createdAt: dateFilter,
//                 }),
//               },
//               include: {
//                 user: {
//                   select: { id: true, name: true, email: true },
//                 },
//                 fromUser: {
//                   select: { id: true, name: true, email: true },
//                 },
//                 toUser: {
//                   select: { id: true, name: true, email: true },
//                 },
//                 task: {
//                   select: { taskNumber: true, status: true },
//                 },
//               },
//               orderBy: { createdAt: "desc" },
//             });

//             for (const event of packingEvents) {
//               const metadata: any = {
//                 taskNumber: event.task.taskNumber,
//               };

//               // Add reassignment info if present
//               if (event.fromUser) {
//                 metadata.fromUserId = event.fromUser.id;
//                 metadata.fromUserName = event.fromUser.name;
//               }
//               if (event.toUser) {
//                 metadata.toUserId = event.toUser.id;
//                 metadata.toUserName = event.toUser.name;
//               }

//               // Add any additional data from the data JSON field
//               if (event.data) {
//                 metadata.reassignmentReason = (event.data as any).reason;
//                 metadata.progress = (event.data as any).progress;
//               }

//               timeline.push({
//                 id: `packing-event-${event.id}`,
//                 type: "PACKING",
//                 eventType: event.eventType,
//                 timestamp: event.createdAt.toISOString(),
//                 user: event.user,
//                 notes: event.notes,
//                 metadata,
//                 data: event.data as Record<string, any>,
//               });
//             }

//             summary.byCategory.packing = packingEvents.length;
//           } catch (packingEventError) {
//             // PackingEvent table doesn't exist yet, fall back to WorkTask milestones
//             console.log(
//               "PackingEvent table not found, using WorkTask milestones"
//             );

//             const workTasks = await prisma.workTask.findMany({
//               where: {
//                 type: "PACKING",
//                 orderIds: { has: orderId },
//                 ...(Object.keys(dateFilter).length > 0 && {
//                   createdAt: dateFilter,
//                 }),
//               },
//               include: {
//                 assignedTo: {
//                   select: { id: true, name: true, email: true },
//                 },
//                 startedBy: {
//                   select: { id: true, name: true, email: true },
//                 },
//                 completedBy: {
//                   select: { id: true, name: true, email: true },
//                 },
//               },
//               orderBy: { createdAt: "desc" },
//             });

//             for (const task of workTasks) {
//               // Task created/assigned
//               timeline.push({
//                 id: `task-created-${task.id}`,
//                 type: "PACKING",
//                 eventType: "TASK_CREATED",
//                 timestamp: task.createdAt.toISOString(),
//                 user: task.assignedTo,
//                 metadata: {
//                   taskNumber: task.taskNumber,
//                   totalOrders: task.orderIds.length,
//                   totalItems: task.totalItems || 0,
//                 },
//               });

//               // Task started
//               if (task.startedAt && task.startedBy) {
//                 timeline.push({
//                   id: `task-started-${task.id}`,
//                   type: "PACKING",
//                   eventType: "TASK_STARTED",
//                   timestamp: task.startedAt.toISOString(),
//                   user: task.startedBy,
//                   metadata: {
//                     taskNumber: task.taskNumber,
//                   },
//                 });
//               }

//               // Task completed
//               if (task.completedAt && task.completedBy) {
//                 timeline.push({
//                   id: `task-completed-${task.id}`,
//                   type: "PACKING",
//                   eventType: "TASK_COMPLETED",
//                   timestamp: task.completedAt.toISOString(),
//                   user: task.completedBy,
//                   metadata: {
//                     taskNumber: task.taskNumber,
//                     completedOrders: task.orderIds.length,
//                     totalOrders: task.orderIds.length,
//                   },
//                 });
//               }
//             }

//             summary.byCategory.packing = workTasks.length * 2; // Approximate
//           }
//         }
//       } catch (error) {
//         console.error("Error fetching packing events:", error);
//       }
//     }

//     // 4. Fetch shipping events
//     if (!eventType || eventType === "SHIPPING") {
//       try {
//         const packages = await prisma.shippingPackage.findMany({
//           where: {
//             orderId,
//             ...(Object.keys(dateFilter).length > 0 && {
//               createdAt: dateFilter,
//             }),
//           },
//           include: {
//             createdBy: {
//               select: { id: true, name: true, email: true },
//             },
//             shippedBy: {
//               select: { id: true, name: true, email: true },
//             },
//           },
//           orderBy: { createdAt: "desc" },
//         });

//         for (const pkg of packages) {
//           // Label created
//           if (pkg.trackingNumber) {
//             timeline.push({
//               id: `label-${pkg.id}`,
//               type: "SHIPPING",
//               eventType: "LABEL_CREATED",
//               timestamp: pkg.createdAt.toISOString(),
//               user: pkg.createdBy,
//               metadata: {
//                 trackingNumber: pkg.trackingNumber,
//                 carrier: pkg.carrier || "Unknown",
//                 service: pkg.serviceLevel || "Standard",
//                 weight: pkg.weight,
//                 cost: pkg.shippingCost,
//               },
//             });
//           }

//           // Package shipped
//           if (pkg.shippedAt && pkg.shippedBy) {
//             timeline.push({
//               id: `shipped-${pkg.id}`,
//               type: "SHIPPING",
//               eventType: "PACKAGE_SHIPPED",
//               timestamp: pkg.shippedAt.toISOString(),
//               user: pkg.shippedBy,
//               metadata: {
//                 trackingNumber: pkg.trackingNumber,
//                 carrier: pkg.carrier || "Unknown",
//               },
//             });
//           }
//         }
//         summary.byCategory.shipping = packages.length;
//       } catch (error) {
//         console.error("Error fetching shipping packages:", error);
//       }
//     }

//     // 5. Fetch back order events
//     if (!eventType || eventType === "BACK_ORDER") {
//       try {
//         const backOrders = await prisma.backOrder.findMany({
//           where: {
//             orderId,
//             ...(Object.keys(dateFilter).length > 0 && {
//               createdAt: dateFilter,
//             }),
//           },
//           include: {
//             item: {
//               select: {
//                 sku: true,
//                 name: true,
//               },
//             },
//             createdBy: {
//               select: { id: true, name: true, email: true },
//             },
//             fulfilledBy: {
//               select: { id: true, name: true, email: true },
//             },
//           },
//           orderBy: { createdAt: "desc" },
//         });

//         for (const backOrder of backOrders) {
//           // Back order created
//           timeline.push({
//             id: `backorder-created-${backOrder.id}`,
//             type: "BACK_ORDER",
//             eventType: "CREATED",
//             timestamp: backOrder.createdAt.toISOString(),
//             user: backOrder.createdBy,
//             metadata: {
//               quantity: backOrder.quantity,
//               sku: backOrder.item.sku,
//               itemName: backOrder.item.name,
//               reason: backOrder.reason || "INSUFFICIENT_STOCK",
//               expectedDate: backOrder.expectedRestockDate?.toISOString(),
//             },
//           });

//           // Back order fulfilled
//           if (backOrder.fulfilledAt && backOrder.fulfilledBy) {
//             timeline.push({
//               id: `backorder-fulfilled-${backOrder.id}`,
//               type: "BACK_ORDER",
//               eventType: "FULFILLED",
//               timestamp: backOrder.fulfilledAt.toISOString(),
//               user: backOrder.fulfilledBy,
//               metadata: {
//                 quantity: backOrder.quantity,
//                 sku: backOrder.item.sku,
//                 itemName: backOrder.item.name,
//               },
//             });
//           }
//         }
//         summary.byCategory.backOrders = backOrders.length;
//       } catch (error) {
//         console.error("Error fetching back orders:", error);
//       }
//     }

//     // Sort timeline by timestamp (most recent first)
//     timeline.sort(
//       (a, b) =>
//         new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
//     );

//     summary.totalEvents = timeline.length;

//     // Apply pagination
//     const startIndex = (page - 1) * pageSize;
//     const endIndex = startIndex + pageSize;
//     const paginatedTimeline = timeline.slice(startIndex, endIndex);

//     const response: AuditTrailResponse = {
//       timeline: paginatedTimeline,
//       summary,
//       pagination: {
//         total: timeline.length,
//         page,
//         pageSize,
//         hasMore: endIndex < timeline.length,
//       },
//     };

//     return NextResponse.json(response);
//   } catch (error) {
//     console.error("Audit trail error:", error);
//     return NextResponse.json(
//       {
//         error: "Failed to fetch audit trail",
//         message: error instanceof Error ? error.message : "Unknown error",
//         details:
//           process.env.NODE_ENV === "development"
//             ? error instanceof Error
//               ? error.stack
//               : undefined
//             : undefined,
//       },
//       { status: 500 }
//     );
//   }
// }
