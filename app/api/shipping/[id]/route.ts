import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get order details for packing
    const order = await prisma.order.findUnique({
      where: { id },
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

    if (order.status !== "PACKED") {
      return NextResponse.json(
        { error: "Order must be picked before packing" },
        { status: 400 }
      );
    }

    // Calculate shipping recommendations
    const totalWeight = order.items.reduce(
      (sum, item) =>
        sum + (Number(item.productVariant.weight) || 1) * item.quantity,
      0
    );

    const totalVolume = order.items.reduce((sum, item) => {
      const dims = item.productVariant.dimensions as any;
      const volume = dims ? dims.length * dims.width * dims.height : 100; // default 100 cubic inches
      return sum + volume * item.quantity;
    }, 0);

    // Suggest box size based on volume
    let suggestedBox = "SMALL";
    if (totalVolume > 1000) suggestedBox = "LARGE";
    else if (totalVolume > 500) suggestedBox = "MEDIUM";

    const shippingAddr = order.shippingAddress as any;

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status: order.status,
        totalAmount: order.totalAmount.toString(),
        shippingAddress: shippingAddr,
        billingAddress: order.billingAddress,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productVariant.product.name,
          sku: item.productVariant.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString(),
          weight: Number(item.productVariant.weight) || 1,
          dimensions: item.productVariant.dimensions,
        })),
      },
      packingInfo: {
        totalWeight,
        totalVolume,
        suggestedBox,
        estimatedShippingCost: totalWeight * 0.5, // rough estimate
      },
    });
  } catch (error) {
    console.error("Error fetching order for packing:", error);
    return NextResponse.json(
      { error: "Failed to fetch order details" },
      { status: 500 }
    );
  }
}
