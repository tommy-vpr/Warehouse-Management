// app/api/packing-tasks/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { WorkTaskStatus } from "@prisma/client";

/**
 * GET /api/packing-tasks
 * Get all packing tasks with optional filters
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assignedTo");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  console.log("📋 GET /api/packing-tasks", { status, assignedTo, page, limit });

  try {
    const skip = (page - 1) * limit;

    const where = {
      type: "PACKING" as const,
      ...(status && {
        status: {
          in: status.split(",").map((s) => s.trim() as WorkTaskStatus),
        },
      }),
      ...(assignedTo && { assignedTo }),
    };

    // Get total count for pagination
    const totalCount = await prisma.workTask.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    const tasks = await prisma.workTask.findMany({
      where,
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        taskItems: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                customerName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    console.log(
      `✅ Found ${tasks.length} packing tasks (page ${page}/${totalPages})`
    );

    const tasksWithProgress = tasks.map((task) => ({
      ...task,
      completionRate:
        task.totalOrders > 0
          ? Math.round((task.completedOrders / task.totalOrders) * 100)
          : 0,
    }));

    return NextResponse.json({
      tasks: tasksWithProgress,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching packing tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch packing tasks", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/packing-tasks
 * Create packing task from PICKED orders
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderIds, assignedTo, priority } = body;

    console.log("Creating packing task:", { orderIds, assignedTo, priority });

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

    // Get orders that are ready for packing (status: PICKED)
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        status: "PICKED",
      },
      include: {
        items: true,
      },
    });

    console.log(`Found ${orders.length} orders ready for packing`);

    if (orders.length === 0) {
      return NextResponse.json(
        {
          error: "No orders ready for packing. Orders must have status PICKED.",
        },
        { status: 400 }
      );
    }

    // Create task items (one per order for packing)
    const taskItems = orders.map((order, idx) => ({
      orderId: order.id,
      quantityRequired: order.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
      sequence: idx + 1,
    }));

    // Generate task number
    const taskNumber = `PACK-${Date.now().toString().slice(-6)}`;

    console.log("Creating packing task:", taskNumber);

    const packingTask = await prisma.workTask.create({
      data: {
        taskNumber,
        type: "PACKING",
        status: "ASSIGNED",
        assignedTo,
        priority: priority || 0,
        orderIds: orders.map((o) => o.id),
        totalOrders: orders.length,
        totalItems: taskItems.reduce(
          (sum, item) => sum + item.quantityRequired,
          0
        ),
        taskItems: {
          create: taskItems,
        },
      },
      include: {
        taskItems: {
          include: {
            order: true,
          },
        },
        assignedUser: true,
      },
    });

    console.log("Packing task created:", packingTask.taskNumber);

    // Update order statuses
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        status: "PACKED",
        currentStage: "PACKING",
        packingAssignedTo: assignedTo,
        packingAssignedAt: new Date(),
      },
    });

    console.log("Orders updated to PACKING status");

    // ========================================
    // 🔔 SEND NOTIFICATION TO ASSIGNED USER
    // ========================================
    try {
      const { notifyUser } = await import("@/lib/ably-server");

      await notifyUser(assignedTo, {
        type: "TASK_ASSIGNED",
        title: "New Packing Task Assigned",
        message: `You have been assigned to pack ${orders.length} order${
          orders.length > 1 ? "s" : ""
        } (${packingTask.taskNumber})`,
        link: `/tasks/packing/${packingTask.id}`,
        metadata: {
          taskNumber: packingTask.taskNumber,
          totalOrders: orders.length,
          totalItems: taskItems.reduce(
            (sum, item) => sum + item.quantityRequired,
            0
          ),
          priority: priority || 0,
        },
      });

      console.log(`✅ Notification sent to user ${assignedTo}`);
    } catch (notificationError) {
      console.error("Failed to send notification:", notificationError);
      // Don't fail the entire request if notification fails
    }

    return NextResponse.json(packingTask, { status: 201 });
  } catch (error) {
    console.error("Error creating packing task:", error);
    return NextResponse.json(
      { error: "Failed to create packing task", details: error.message },
      { status: 500 }
    );
  }
}

// // app/api/packing-tasks/route.ts
// import { prisma } from "@/lib/prisma";
// import { NextRequest, NextResponse } from "next/server";
// import { WorkTaskStatus } from "@prisma/client";

// /**
//  * GET /api/packing-tasks
//  * Get all packing tasks with optional filters
//  */
// export async function GET(req: NextRequest) {
//   const { searchParams } = new URL(req.url);
//   const status = searchParams.get("status");
//   const assignedTo = searchParams.get("assignedTo");

//   console.log("📋 GET /api/packing-tasks", { status, assignedTo });

//   try {
//     const tasks = await prisma.workTask.findMany({
//       where: {
//         type: "PACKING",
//         ...(status && {
//           status: {
//             in: status.split(",").map((s) => s.trim() as WorkTaskStatus),
//           },
//         }),
//         ...(assignedTo && { assignedTo }),
//       },
//       include: {
//         assignedUser: {
//           select: { id: true, name: true, email: true },
//         },
//         taskItems: {
//           include: {
//             order: {
//               select: {
//                 id: true,
//                 orderNumber: true,
//                 customerName: true,
//               },
//             },
//           },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     console.log(`✅ Found ${tasks.length} packing tasks`);

//     const tasksWithProgress = tasks.map((task) => ({
//       ...task,
//       completionRate:
//         task.totalOrders > 0
//           ? Math.round((task.completedOrders / task.totalOrders) * 100)
//           : 0,
//     }));

//     return NextResponse.json(tasksWithProgress);
//   } catch (error) {
//     console.error("Error fetching packing tasks:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch packing tasks", details: error.message },
//       { status: 500 }
//     );
//   }
// }

// /**
//  * POST /api/packing-tasks
//  * Create packing task from PICKED orders
//  */
// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { orderIds, assignedTo, priority } = body;

//     console.log("Creating packing task:", { orderIds, assignedTo, priority });

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

//     // Get orders that are ready for packing (status: PICKED)
//     const orders = await prisma.order.findMany({
//       where: {
//         id: { in: orderIds },
//         status: "PICKED",
//       },
//       include: {
//         items: true,
//       },
//     });

//     console.log(`Found ${orders.length} orders ready for packing`);

//     if (orders.length === 0) {
//       return NextResponse.json(
//         {
//           error: "No orders ready for packing. Orders must have status PICKED.",
//         },
//         { status: 400 }
//       );
//     }

//     // Create task items (one per order for packing)
//     const taskItems = orders.map((order, idx) => ({
//       orderId: order.id,
//       quantityRequired: order.items.reduce(
//         (sum, item) => sum + item.quantity,
//         0
//       ),
//       sequence: idx + 1,
//     }));

//     // Generate task number
//     const taskNumber = `PACK-${Date.now().toString().slice(-6)}`;

//     console.log("Creating packing task:", taskNumber);

//     const packingTask = await prisma.workTask.create({
//       data: {
//         taskNumber,
//         type: "PACKING",
//         status: "ASSIGNED",
//         assignedTo,
//         priority: priority || 0,
//         orderIds: orders.map((o) => o.id),
//         totalOrders: orders.length,
//         totalItems: taskItems.reduce(
//           (sum, item) => sum + item.quantityRequired,
//           0
//         ),
//         taskItems: {
//           create: taskItems,
//         },
//       },
//       include: {
//         taskItems: {
//           include: {
//             order: true,
//           },
//         },
//         assignedUser: true,
//       },
//     });

//     console.log("Packing task created:", packingTask.taskNumber);

//     // Update order statuses
//     await prisma.order.updateMany({
//       where: { id: { in: orderIds } },
//       data: {
//         status: "PACKED",
//         currentStage: "PACKING",
//         packingAssignedTo: assignedTo,
//         packingAssignedAt: new Date(),
//       },
//     });

//     console.log("Orders updated to PACKING status");

//     // ========================================
//     // 🔔 SEND NOTIFICATION TO ASSIGNED USER
//     // ========================================
//     try {
//       const { notifyUser } = await import("@/lib/ably-server");

//       await notifyUser(assignedTo, {
//         type: "TASK_ASSIGNED",
//         title: "New Packing Task Assigned",
//         message: `You have been assigned to pack ${orders.length} order${
//           orders.length > 1 ? "s" : ""
//         } (${packingTask.taskNumber})`,
//         link: `/tasks/packing/${packingTask.id}`,
//         metadata: {
//           taskNumber: packingTask.taskNumber,
//           totalOrders: orders.length,
//           totalItems: taskItems.reduce(
//             (sum, item) => sum + item.quantityRequired,
//             0
//           ),
//           priority: priority || 0,
//         },
//       });

//       console.log(`✅ Notification sent to user ${assignedTo}`);
//     } catch (notificationError) {
//       console.error("Failed to send notification:", notificationError);
//       // Don't fail the entire request if notification fails
//     }

//     return NextResponse.json(packingTask, { status: 201 });
//   } catch (error) {
//     console.error("Error creating packing task:", error);
//     return NextResponse.json(
//       { error: "Failed to create packing task", details: error.message },
//       { status: 500 }
//     );
//   }
// }
