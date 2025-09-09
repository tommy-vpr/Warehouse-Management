import { NextRequest, NextResponse } from "next/server";
import { shipengine } from "@/lib/shipengine";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, serviceCode, carrierCode } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get order from database
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

    if (order.status !== "ALLOCATED" && order.status !== "PICKED") {
      return NextResponse.json(
        { error: "Order must be allocated or picked before shipping" },
        { status: 400 }
      );
    }

    // Default warehouse address (you should make this configurable)
    const warehouseAddress = {
      name: process.env.WAREHOUSE_NAME || "Your Warehouse",
      company_name: process.env.WAREHOUSE_COMPANY || "Your Company",
      address_line1: process.env.WAREHOUSE_ADDRESS1 || "123 Warehouse St",
      city_locality: process.env.WAREHOUSE_CITY || "Your City",
      state_province: process.env.WAREHOUSE_STATE || "CA",
      postal_code: process.env.WAREHOUSE_ZIP || "90210",
      country_code: "US",
      phone: process.env.WAREHOUSE_PHONE || "555-123-4567",
    };

    // Create shipment data
    const shipment = {
      ship_from: warehouseAddress,
      ship_to: {
        name: order.customerName,
        ...(order.shippingAddress as any),
        country_code: (order.shippingAddress as any)?.country || "US",
      },
      packages: [
        {
          weight: {
            value:
              order.items.reduce(
                (total, item) =>
                  total +
                  (Number(item.productVariant.weight) || 1) * item.quantity,
                0
              ) || 1,
            unit: "pound" as const,
          },
          dimensions: {
            unit: "inch" as const,
            length: 12,
            width: 9,
            height: 6,
          },
          label_messages: {
            reference1: order.orderNumber,
            reference2: `Items: ${order.items.length}`,
          },
        },
      ],
      service_code: serviceCode,
    };

    // Create label
    const label = await shipengine.createLabelFromShipment(shipment, {
      test_label: process.env.SHIPENGINE_SANDBOX === "true",
      label_format: "pdf",
      label_layout: "4x6",
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
      },
    });

    return NextResponse.json({
      success: true,
      label,
      trackingNumber: label.tracking_number,
      labelUrl: label.label_download.href,
      shipmentCost: label.shipment_cost.amount,
      orderId: order.id,
      orderNumber: order.orderNumber,
      isTestLabel: process.env.SHIPENGINE_SANDBOX === "true",
    });
  } catch (error) {
    console.error("Error creating ShipEngine label:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create shipping label";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
