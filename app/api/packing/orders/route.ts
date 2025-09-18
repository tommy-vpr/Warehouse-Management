// app/api/packing/orders/route.ts
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

    // Get orders that are picked and ready for packing
    const orders = await prisma.order.findMany({
      where: {
        status: "PICKED",
      },
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
      orderBy: [
        { createdAt: "asc" }, // FIFO - oldest orders first
      ],
    });

    // Transform orders for pack station display
    const packableOrders = orders.map((order) => {
      const shippingAddr = order.shippingAddress as any;

      // Calculate total weight and priority
      const totalWeight = order.items.reduce(
        (sum, item) =>
          sum + (Number(item.productVariant.weight) || 1) * item.quantity,
        0
      );

      // Determine priority based on order age and value
      const orderAge = Date.now() - new Date(order.createdAt).getTime();
      const hoursOld = orderAge / (1000 * 60 * 60);
      const orderValue = Number(order.totalAmount);

      let priority: "LOW" | "MEDIUM" | "HIGH" = "LOW";
      if (hoursOld > 24 || orderValue > 200) priority = "HIGH";
      else if (hoursOld > 12 || orderValue > 100) priority = "MEDIUM";

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status: order.status,
        totalAmount: order.totalAmount.toString(),
        itemCount: order.items.length,
        totalWeight: totalWeight,
        priority,
        pickedAt: order.updatedAt.toISOString(),
        shippingAddress: {
          city: shippingAddr?.city || "Unknown",
          state:
            shippingAddr?.province_code || shippingAddr?.province || "Unknown",
          zip: shippingAddr?.zip || "Unknown",
          country: shippingAddr?.country_code || "US",
        },
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productVariant.product.name,
          variantName: item.productVariant.name,
          sku: item.productVariant.sku,
          quantity: item.quantity,
          weight: Number(item.productVariant.weight) || 1,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      orders: packableOrders,
      summary: {
        totalOrders: packableOrders.length,
        highPriorityOrders: packableOrders.filter((o) => o.priority === "HIGH")
          .length,
        totalWeight: packableOrders.reduce((sum, o) => sum + o.totalWeight, 0),
      },
    });
  } catch (error) {
    console.error("Error fetching packable orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch packable orders" },
      { status: 500 }
    );
  }
}
