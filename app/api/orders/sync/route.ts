import { NextResponse } from "next/server";
import { getShopifyOrders } from "@/lib/shopify";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const shopifyOrders = await getShopifyOrders();

    for (const orderEdge of shopifyOrders.orders.edges) {
      const order = orderEdge.node;

      // Check if order already exists
      const existingOrder = await prisma.order.findUnique({
        where: { shopifyOrderId: order.id },
      });

      if (!existingOrder) {
        // Create new order
        await prisma.order.create({
          data: {
            shopifyOrderId: order.id,
            orderNumber: order.name,
            customerName: `${order.shippingAddress?.firstName} ${order.shippingAddress?.lastName}`,
            customerEmail: order.email,
            totalAmount: parseFloat(order.totalPriceSet.shopMoney.amount),
            shippingAddress: order.shippingAddress,
            status: "PENDING",
            items: {
              create: order.lineItems.edges.map((item: any) => ({
                quantity: item.node.quantity,
                unitPrice: parseFloat(
                  item.node.originalUnitPriceSet.shopMoney.amount
                ),
                totalPrice:
                  parseFloat(item.node.originalUnitPriceSet.shopMoney.amount) *
                  item.node.quantity,
                productVariant: {
                  connect: { sku: item.node.variant.sku },
                },
              })),
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error syncing orders:", error);

    // Proper error handling for unknown type
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
