// app/api/inventory/cycle-counts/route.ts - Real implementation
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const statusFilter = searchParams.get("status");
    const typeFilter = searchParams.get("type");

    // Build where clause for filtering
    const where: any = {};

    if (search) {
      where.OR = [
        { taskNumber: { contains: search, mode: "insensitive" } },
        { assignedUser: { name: { contains: search, mode: "insensitive" } } },
        { location: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    if (typeFilter && typeFilter !== "ALL") {
      where.countType = typeFilter;
    }

    // Get cycle count tasks with relationships
    const tasks = await prisma.cycleCountTask.findMany({
      where,
      include: {
        location: true,
        productVariant: {
          include: { product: true },
        },
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        campaign: true,
        events: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    // Calculate statistics
    const stats = {
      totalCounts: await prisma.cycleCountTask.count(),
      pending: await prisma.cycleCountTask.count({
        where: { status: "PENDING" },
      }),
      inProgress: await prisma.cycleCountTask.count({
        where: { status: "IN_PROGRESS" },
      }),
      completed: await prisma.cycleCountTask.count({
        where: { status: "COMPLETED" },
      }),
      averageAccuracy: await calculateAverageAccuracy(),
      totalVariances: await prisma.cycleCountTask.count({
        where: {
          AND: [{ variance: { not: null } }, { variance: { not: 0 } }],
        },
      }),
      countsThisWeek: await prisma.cycleCountTask.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    };

    return NextResponse.json({ counts: tasks, stats });
  } catch (error) {
    console.error("Error fetching cycle counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch cycle counts" },
      { status: 500 }
    );
  }
}

async function calculateAverageAccuracy(): Promise<number> {
  const completedTasks = await prisma.cycleCountTask.findMany({
    where: {
      status: "COMPLETED",
      variance: { not: null },
    },
    select: {
      systemQuantity: true,
      variance: true,
    },
  });

  if (completedTasks.length === 0) return 100;

  const totalAccuracy = completedTasks.reduce((sum, task) => {
    const accuracy =
      task.systemQuantity > 0
        ? Math.max(
            0,
            100 - (Math.abs(task.variance || 0) / task.systemQuantity) * 100
          )
        : 100;
    return sum + accuracy;
  }, 0);

  return totalAccuracy / completedTasks.length;
}
