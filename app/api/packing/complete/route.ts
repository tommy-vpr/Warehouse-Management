// app/api/packing/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/order-status-helper"; // ← ADD THIS

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

    const order = await prisma.$transaction(async (tx) => {
      // Update order details
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          shippingCarrier: carrierCode,
          shippingService,
          notes,
        },
      });

      // ✅ UPDATE: Mark back orders as PACKED
      await tx.backOrder.updateMany({
        where: {
          orderId: orderId,
          status: "PICKED",
        },
        data: {
          status: "PACKED",
        },
      });

      // Update status with history tracking
      await updateOrderStatus({
        orderId,
        newStatus: "PACKED",
        userId: session.user.id,
        notes: `Packed in ${boxType} box${notes ? ` - ${notes}` : ""}`,
        tx,
      });

      return updatedOrder;
    });

    return NextResponse.json({
      success: true,
      message: "Order packed successfully",
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: "PACKED",
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
// // app/api/packing/complete/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";

// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const {
//       orderId,
//       boxType,
//       actualWeight,
//       dimensions,
//       shippingService,
//       carrierCode,
//       notes,
//     } = await request.json();

//     // Update order status to packed
//     const order = await prisma.order.update({
//       where: { id: orderId },
//       data: {
//         status: "PACKED",
//         shippingCarrier: carrierCode,
//         shippingService,
//         notes,
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       message: "Order packed successfully",
//       order: {
//         id: order.id,
//         orderNumber: order.orderNumber,
//         status: order.status,
//         shippingCarrier: order.shippingCarrier,
//         shippingService: order.shippingService,
//       },
//       packing: {
//         boxType,
//         actualWeight,
//         dimensions,
//         notes,
//       },
//       nextStep: "CREATE_SHIPPING_LABEL",
//     });
//   } catch (error) {
//     console.error("Error completing packing:", error);
//     return NextResponse.json(
//       { error: "Failed to complete packing" },
//       { status: 500 }
//     );
//   }
// }
