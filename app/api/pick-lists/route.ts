// app/api/pick-lists/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status && status !== "ALL") {
      // Handle multiple statuses (comma-separated)
      const statuses = status.split(",");
      where.status = statuses.length === 1 ? status : { in: statuses };
    }

    // Get total count
    const totalCount = await prisma.pickList.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch pick lists with pagination
    const pickLists = await prisma.pickList.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          select: {
            id: true,
            quantityToPick: true,
            quantityPicked: true,
            status: true,
          },
        },
      },
    });

    // Calculate metrics for each pick list
    const enrichedPickLists = pickLists.map((pickList) => {
      const totalItems = pickList.items.reduce(
        (sum, item) => sum + item.quantityToPick,
        0
      );
      const pickedItems = pickList.items.reduce(
        (sum, item) => sum + item.quantityPicked,
        0
      );
      const completionRate =
        totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 0;
      const itemsRemaining = totalItems - pickedItems;

      return {
        id: pickList.id,
        batchNumber: pickList.batchNumber,
        status: pickList.status,
        assignedTo: pickList.assignedTo,
        totalItems,
        pickedItems,
        completionRate,
        itemsRemaining,
        createdAt: pickList.createdAt.toISOString(),
        updatedAt: pickList.updatedAt.toISOString(),
        assignedUser: pickList.assignedUser,
      };
    });

    return NextResponse.json({
      pickLists: enrichedPickLists,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching pick lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch pick lists" },
      { status: 500 }
    );
  }
}
