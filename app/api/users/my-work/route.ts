// app/api/my-work/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // picking, packing, shipping, or null for all
    const status = searchParams.get("status"); // PENDING, IN_PROGRESS, COMPLETED
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const skip = (page - 1) * limit;
    const userId = session.user.id;

    console.log("📋 Fetching user tasks...", {
      userId,
      type,
      status,
      page,
      limit,
    });

    // Build where clause
    const where: any = {
      assignedTo: userId,
    };

    if (type) {
      where.type = type.toUpperCase();
    }

    if (status) {
      where.status = status;
    }

    // Get total count
    const totalCount = await prisma.workTask.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch tasks with related data
    const tasks = await prisma.workTask.findMany({
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
              },
            },
          },
        },
      },
      orderBy: [
        {
          status: "asc", // PENDING first, then IN_PROGRESS, then COMPLETED
        },
        {
          createdAt: "desc",
        },
      ],
      skip,
      take: limit,
    });

    // Add calculated fields
    const tasksWithExtras = tasks.map((task) => {
      // Get unique orders from task items
      const uniqueOrders = new Map<string, string>();
      task.taskItems.forEach((item) => {
        if (item.order) {
          uniqueOrders.set(item.order.id, item.order.orderNumber);
        }
      });

      const totalOrders = uniqueOrders.size;
      const orderNumbers = Array.from(uniqueOrders.values());

      // Use the completedOrders from the WorkTask model (already tracked)
      const completedOrders = task.completedOrders;

      // Calculate progress percentage
      const progress =
        totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

      return {
        id: task.id,
        taskNumber: task.taskNumber,
        type: task.type,
        status: task.status,
        createdAt: task.createdAt.toISOString(),
        totalOrders,
        completedOrders,
        orderNumbers,
        progress,
        priority: task.priority,
        notes: task.notes,
      };
    });

    console.log(
      `✅ Found ${tasks.length} tasks (page ${page}/${totalPages}, total: ${totalCount})`
    );

    return NextResponse.json({
      tasks: tasksWithExtras,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("❌ Error fetching user tasks:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch tasks";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
