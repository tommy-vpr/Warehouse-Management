import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";

    let dateFilter: Date | undefined;
    const now = new Date();

    switch (period) {
      case "today":
        dateFilter = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }

    const orders = await prisma.order.findMany({
      where: {
        status: "SHIPPED",
        shippedAt: dateFilter ? { gte: dateFilter } : undefined,
      },
      include: {
        packages: {
          select: {
            id: true,
            trackingNumber: true,
            carrierCode: true,
            serviceCode: true,
            labelUrl: true,
            cost: true,
          },
        },
      },
      orderBy: { shippedAt: "desc" },
    });

    const formatted = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      shippedAt: order.shippedAt?.toISOString() || "",
      status: order.status,
      packages: order.packages.map((pkg) => ({
        id: pkg.id,
        trackingNumber: pkg.trackingNumber,
        carrierCode: pkg.carrierCode,
        serviceCode: pkg.serviceCode,
        labelUrl: pkg.labelUrl,
        cost: pkg.cost.toString(),
      })),
      totalCost: order.packages.reduce(
        (sum, pkg) => sum + parseFloat(pkg.cost.toString()),
        0
      ),
      packageCount: order.packages.length,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching shipped orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
