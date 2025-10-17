// app/api/shipping/tracking/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument } from "pdf-lib";

// GET /api/shipping/tracking/:id
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch order with all related packages AND items
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        packages: {
          include: {
            items: true, // ✅ NEW: Include items in each package
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Calculate totals
    const totalCost = order.packages.reduce(
      (sum, pkg) => sum + Number(pkg.cost || 0),
      0
    );
    const totalWeight = order.packages.reduce(
      (sum, pkg) => sum + Number(pkg.weight || 0),
      0
    );

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        status: order.status,
        shippedAt: order.shippedAt,
      },
      packages: order.packages.map((pkg) => ({
        id: pkg.id,
        carrierCode: pkg.carrierCode,
        serviceCode: pkg.serviceCode,
        packageCode: pkg.packageCode,
        trackingNumber: pkg.trackingNumber,
        labelUrl: pkg.labelUrl,
        cost: pkg.cost.toString(),
        currency: pkg.currency,
        weight: pkg.weight ? Number(pkg.weight) : 0,
        dimensions: pkg.dimensions as any,
        createdAt: pkg.createdAt,
        // ✅ NEW: Include items in response
        items: pkg.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
        })),
      })),
      totalCost,
      totalWeight,
    });
  } catch (error) {
    console.error("[Tracking API Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking information" },
      { status: 500 }
    );
  }
}

// // app/api/shipping/tracking/[id]/route.ts
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// // GET /api/shipping/tracking/:id
// // `id` here = orderId
// export async function GET(
//   req: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const { id } = params;

//     // Fetch order with all related packages
//     const order = await prisma.order.findUnique({
//       where: { id },
//       include: {
//         packages: true, // ShippingPackage[]
//       },
//     });

//     if (!order) {
//       return NextResponse.json({ error: "Order not found" }, { status: 404 });
//     }

//     // Calculate totals
//     const totalCost = order.packages.reduce(
//       (sum, pkg) => sum + Number(pkg.cost || 0),
//       0
//     );
//     const totalWeight = order.packages.reduce(
//       (sum, pkg) => sum + Number(pkg.weight || 0),
//       0
//     );

//     return NextResponse.json({
//       order: {
//         id: order.id,
//         orderNumber: order.orderNumber,
//         customerName: order.customerName,
//         status: order.status,
//         shippedAt: order.shippedAt,
//       },
//       packages: order.packages.map((pkg) => ({
//         id: pkg.id,
//         carrierCode: pkg.carrierCode,
//         serviceCode: pkg.serviceCode,
//         packageCode: pkg.packageCode,
//         trackingNumber: pkg.trackingNumber,
//         labelUrl: pkg.labelUrl,
//         cost: pkg.cost.toString(),
//         currency: pkg.currency,
//         weight: pkg.weight ? Number(pkg.weight) : 0,
//         dimensions: pkg.dimensions as any,
//         createdAt: pkg.createdAt,
//       })),
//       totalCost,
//       totalWeight,
//     });
//   } catch (error) {
//     console.error("[Tracking API Error]", error);
//     return NextResponse.json(
//       { error: "Failed to fetch tracking information" },
//       { status: 500 }
//     );
//   }
// }
