import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderWithExtras = {
      ...order,
      itemCount: order.items.length,
      totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    };

    return NextResponse.json(orderWithExtras);
  } catch (error) {
    console.error("❌ Error fetching order:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch order";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
