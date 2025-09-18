// app/api/packing/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      orderId,
      boxType,
      actualWeight,
      dimensions,
      shippingService,
      carrierCode,
      notes,
    } = await request.json();

    // Update order status to packed
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PACKED",
        shippingCarrier: carrierCode,
        shippingService,
        notes,
      },
    });

    // TODO: Create packing record in database
    // await prisma.packingRecord.create({
    //   data: {
    //     orderId,
    //     packedBy: session.user.id,
    //     boxType,
    //     actualWeight,
    //     dimensions,
    //     packedAt: new Date(),
    //     notes
    //   }
    // });

    return NextResponse.json({
      success: true,
      message: "Order packed successfully",
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        shippingCarrier: order.shippingCarrier,
        shippingService: order.shippingService,
      },
      packing: {
        boxType,
        actualWeight,
        dimensions,
        notes,
      },
      nextStep: "CREATE_SHIPPING_LABEL",
    });
  } catch (error) {
    console.error("Error completing packing:", error);
    return NextResponse.json(
      { error: "Failed to complete packing" },
      { status: 500 }
    );
  }
}
