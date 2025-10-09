// app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Total products (distinct product variants)
    const totalProducts = await prisma.productVariant.count();

    // Low stock items (below reorder point)
    const inventory = await prisma.inventory.groupBy({
      by: ["productVariantId"],
      _sum: {
        quantityOnHand: true,
        quantityReserved: true,
      },
      _max: {
        reorderPoint: true,
      },
    });

    const lowStock = inventory.filter((item) => {
      const available =
        (item._sum.quantityOnHand || 0) - (item._sum.quantityReserved || 0);
      const reorderPoint = item._max.reorderPoint || 0;
      return available > 0 && available <= reorderPoint;
    }).length;

    // Orders to pick (PENDING or ALLOCATED status)
    const ordersToPick = await prisma.order.count({
      where: {
        status: { in: ["PENDING", "ALLOCATED", "PICKING"] },
      },
    });

    // Orders to pack (PICKED status)
    const ordersToPack = await prisma.order.count({
      where: {
        status: "PICKED",
      },
    });

    // Orders to ship (PACKED status)
    const ordersToShip = await prisma.order.count({
      where: {
        status: "PACKED",
      },
    });

    // Today's shipments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayShipments = await prisma.order.count({
      where: {
        shippedAt: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ["SHIPPED", "DELIVERED"] },
      },
    });

    // Pending orders (legacy - same as ordersToPick)
    const pendingOrders = ordersToPick;

    return NextResponse.json({
      totalProducts,
      lowStock,
      pendingOrders,
      todayShipments,
      // New workflow stats
      ordersToPick,
      ordersToPack,
      ordersToShip,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";

// export async function GET() {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Total products (distinct product variants)
//     const totalProducts = await prisma.productVariant.count();

//     // Low stock items
//     const inventory = await prisma.inventory.groupBy({
//       by: ["productVariantId"],
//       _sum: {
//         quantityOnHand: true,
//         quantityReserved: true,
//       },
//       _max: {
//         reorderPoint: true,
//       },
//     });

//     const lowStock = inventory.filter((item) => {
//       const available =
//         (item._sum.quantityOnHand || 0) - (item._sum.quantityReserved || 0);
//       const reorderPoint = item._max.reorderPoint || 0;
//       return available > 0 && available <= reorderPoint;
//     }).length;

//     // Pending orders
//     const pendingOrders = await prisma.order.count({
//       where: {
//         status: { in: ["PENDING", "ALLOCATED"] },
//       },
//     });

//     // Today's shipments
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const todayShipments = await prisma.order.count({
//       where: {
//         shippedAt: { gte: today },
//         status: "SHIPPED",
//       },
//     });

//     return NextResponse.json({
//       totalProducts,
//       lowStock,
//       pendingOrders,
//       todayShipments,
//     });
//   } catch (error) {
//     console.error("Error fetching dashboard stats:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch stats" },
//       { status: 500 }
//     );
//   }
// }
