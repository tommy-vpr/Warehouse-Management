// app/api/work-tasks/backorder-tasks/route.ts
// Fetch WorkTasks that were auto-created from backorder fulfillment
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assignedToMe = searchParams.get("assignedToMe") === "true";
    const backordersOnly = searchParams.get("backordersOnly") !== "false"; // Default true

    // Build query
    const where: any = {
      type: "PICKING",
    };

    // Filter by status if provided
    if (status) {
      where.status = status as any;
    } else {
      // Default to active tasks
      where.status = {
        in: ["PENDING", "ASSIGNED", "IN_PROGRESS"],
      };
    }

    // Filter by assignment
    if (assignedToMe) {
      where.assignedTo = session.user.id;
    }

    // Only show backorder tasks (priority >= 100 or notes contain "backorder")
    if (backordersOnly) {
      where.OR = [
        { priority: { gte: 100 } },
        { notes: { contains: "Backorder", mode: "insensitive" } },
        { notes: { contains: "backorder", mode: "insensitive" } },
      ];
    }

    // Fetch WorkTasks with related data
    const workTasks = await prisma.workTask.findMany({
      where,
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        taskItems: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                customerName: true,
                status: true,
                createdAt: true,
              },
            },
            productVariant: {
              select: {
                id: true,
                sku: true,
                name: true,
              },
            },
            location: {
              select: {
                id: true,
                name: true,
                aisle: true,
                shelf: true,
                bin: true,
              },
            },
          },
        },
      },
      orderBy: [
        { priority: "desc" }, // High priority first
        { createdAt: "asc" }, // FIFO within same priority
      ],
    });

    // Add computed fields
    const tasksWithMetadata = workTasks.map((task) => ({
      ...task,
      isComplete: task.completedItems >= task.totalItems,
      progressPercentage:
        task.totalItems > 0
          ? Math.round((task.completedItems / task.totalItems) * 100)
          : 0,
      // Group items by order for better display
      orderGroups: task.taskItems.reduce((acc: any, item) => {
        const orderNumber = item.order.orderNumber;
        if (!acc[orderNumber]) {
          acc[orderNumber] = {
            orderId: item.order.id,
            orderNumber: item.order.orderNumber,
            customerName: item.order.customerName,
            orderStatus: item.order.status,
            items: [],
          };
        }
        acc[orderNumber].items.push(item);
        return acc;
      }, {}),
    }));

    return NextResponse.json({
      success: true,
      tasks: tasksWithMetadata,
      count: tasksWithMetadata.length,
      summary: {
        total: tasksWithMetadata.length,
        pending: tasksWithMetadata.filter((t) => t.status === "PENDING").length,
        inProgress: tasksWithMetadata.filter((t) => t.status === "IN_PROGRESS")
          .length,
        completed: tasksWithMetadata.filter((t) => t.status === "COMPLETED")
          .length,
      },
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch backorder work tasks:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Claim a backorder task
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taskId } = body;

    // Claim the task
    const task = await prisma.workTask.update({
      where: {
        id: taskId,
        status: "PENDING", // Can only claim pending tasks
        assignedTo: null, // Must be unassigned
      },
      data: {
        status: "ASSIGNED",
        assignedTo: session.user.id,
        assignedAt: new Date(),
      },
      include: {
        taskItems: {
          include: {
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
      },
    });

    // Create task event
    await prisma.taskEvent.create({
      data: {
        taskId: task.id,
        eventType: "TASK_ASSIGNED",
        userId: session.user.id,
        notes: `Task claimed by ${session.user.name}`,
      },
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "TASK_ASSIGNED",
        title: "✅ Task Claimed",
        message: `You claimed backorder picking task ${task.taskNumber}`,
        link: `/dashboard/picking/${task.id}`,
        metadata: {
          taskId: task.id,
          taskNumber: task.taskNumber,
          itemCount: task.totalItems,
        },
      },
    });

    return NextResponse.json({
      success: true,
      task,
      message: `Task ${task.taskNumber} claimed successfully`,
    });
  } catch (error: any) {
    console.error("❌ Failed to claim task:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
