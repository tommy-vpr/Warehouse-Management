// app/api/returns/route.ts
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
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100");

    console.log("📦 Fetching returns...", { status, limit });

    // Build where clause
    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Fetch returns with related data
    const returns = await prisma.returnOrder.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
        receivedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
        inspectedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    console.log(`✅ Found ${returns.length} returns`);

    return NextResponse.json(returns);
  } catch (error) {
    console.error("❌ Error fetching returns:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}
