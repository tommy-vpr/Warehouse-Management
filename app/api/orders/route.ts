import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");

    console.log("📋 Fetching orders...", { status, limit });

    const orders = await prisma.order.findMany({
      where: status ? { status: status as any } : {},
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    console.log(`✅ Found ${orders.length} orders`);

    // Add calculated fields
    const ordersWithExtras = orders.map((order) => ({
      ...order,
      itemCount: order.items.length,
      totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    }));

    return NextResponse.json(ordersWithExtras);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch orders";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
