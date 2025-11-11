// app/api/work-tasks/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.workTask.findUnique({
      where: { id },
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
                totalAmount: true,
                shippingAddress: true,
              },
            },
            productVariant: {
              select: {
                id: true,
                sku: true,
                upc: true,
                barcode: true,
                name: true,
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            location: {
              select: {
                id: true,
                name: true,
                aisle: true,
                bay: true,
                tier: true,
                space: true,
              },
            },
            completedByUser: {
              select: { name: true },
            },
          },
          orderBy: { sequence: "asc" },
        },
        events: {
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAssignedUser = task.assignedTo === session.user.id;
    const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

    if (!isAssignedUser && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Calculate stats
    const stats = {
      // Order-based progress
      totalOrders: task.totalOrders,
      completedOrders: task.completedOrders,
      orderProgress:
        task.totalOrders > 0
          ? Math.round((task.completedOrders / task.totalOrders) * 100)
          : 0,

      // Item-based progress
      totalItems: task.totalItems,
      completedItems: task.completedItems,
      itemProgress:
        task.totalItems > 0
          ? Math.round((task.completedItems / task.totalItems) * 100)
          : 0,

      // Unique orders
      uniqueOrderIds: [...new Set(task.taskItems.map((item) => item.orderId))],
      uniqueOrderNumbers: [
        ...new Set(task.taskItems.map((item) => item.order.orderNumber)),
      ],

      // Status breakdown
      pendingItems: task.taskItems.filter((item) => item.status === "PENDING")
        .length,
      completedItemsCount: task.taskItems.filter(
        (item) => item.status === "COMPLETED"
      ).length,
      skippedItems: task.taskItems.filter((item) => item.status === "SKIPPED")
        .length,
      issueItems: task.taskItems.filter((item) => item.status === "ISSUE")
        .length,
    };

    // Group items by order
    const itemsByOrder = task.taskItems.reduce((acc, item) => {
      const orderId = item.orderId;
      if (!acc[orderId]) {
        acc[orderId] = {
          order: item.order,
          items: [],
        };
      }
      acc[orderId].items.push(item);
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      task: {
        id: task.id,
        taskNumber: task.taskNumber,
        type: task.type,
        status: task.status,
        assignedTo: task.assignedUser,
        priority: task.priority,
        assignedAt: task.assignedAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        notes: task.notes,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
      stats,
      itemsByOrder: Object.values(itemsByOrder),
      allItems: task.taskItems,
      events: task.events,
    });
  } catch (error) {
    console.error("Error fetching task details:", error);
    return NextResponse.json(
      { error: "Failed to fetch task details" },
      { status: 500 }
    );
  }
}
