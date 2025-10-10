// app/api/dashboard/activity/route.ts - FIXED with proper pagination
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "0");
    const type = searchParams.get("type");
    const format = searchParams.get("format");

    // Calculate skip for pagination
    const skip = page * limit;

    // Build where clause for transaction type filter
    const transactionWhere =
      type && type !== "all" ? { transactionType: type as any } : undefined;

    // ✅ Get inventory transactions with proper pagination
    const transactions = await prisma.inventoryTransaction.findMany({
      take: limit,
      skip: skip,
      orderBy: { createdAt: "desc" },
      where: transactionWhere,
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
        location: true,
        user: { select: { id: true, name: true } },
      },
    });

    // ✅ Get recent orders (limited count for mixed feed)
    const orderLimit =
      type === "order" ? limit : Math.min(Math.floor(limit / 3), 20);
    const recentOrders =
      type === "order" || type === "all"
        ? await prisma.order.findMany({
            take: orderLimit,
            skip: type === "order" ? skip : 0,
            orderBy: { createdAt: "desc" },
          })
        : [];

    // ✅ Get cycle count events (limited count for mixed feed)
    const countLimit =
      type === "scan" ? limit : Math.min(Math.floor(limit / 3), 20);
    const countEvents =
      type === "scan" || type === "all"
        ? await prisma.cycleCountEvent.findMany({
            take: countLimit,
            skip: type === "scan" ? skip : 0,
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { id: true, name: true } },
              task: {
                include: {
                  productVariant: {
                    include: { product: true },
                  },
                  location: true,
                },
              },
            },
          })
        : [];

    // Combine all activities
    const allActivities = [
      // Inventory transactions
      ...transactions.map((t) => ({
        id: `txn-${t.id}`,
        type: t.transactionType.toLowerCase(),
        message: `${t.transactionType.replace(/_/g, " ")}: ${
          t.productVariant.product.name
        } (${t.quantityChange > 0 ? "+" : ""}${t.quantityChange})`,
        time: getTimeAgo(t.createdAt),
        userName: t.user?.name || "System",
        userId: t.userId,
        createdAt: t.createdAt.toISOString(),
        details: {
          productVariantId: t.productVariantId,
          sku: t.productVariant.sku,
          productName: t.productVariant.product.name,
          locationId: t.locationId,
          locationName: t.location?.name,
          quantityChange: t.quantityChange,
          referenceId: t.referenceId,
          referenceType: t.referenceType,
          notes: t.notes,
          metadata: t.metadata,
          transactionType: t.transactionType,
        },
        timestamp: t.createdAt,
      })),

      // Orders
      ...recentOrders.map((o) => ({
        id: `order-${o.id}`,
        type: "order",
        message: `New order ${o.orderNumber} from ${o.customerName}`,
        time: getTimeAgo(o.createdAt),
        userName: "Shopify",
        userId: null,
        createdAt: o.createdAt.toISOString(),
        details: {
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          totalAmount: o.totalAmount.toString(),
          status: o.status,
          shippingAddress: o.shippingAddress,
        },
        timestamp: o.createdAt,
      })),

      // Cycle count events
      ...countEvents.map((e) => ({
        id: `count-${e.id}`,
        type: "scan",
        message: formatCountEvent(e),
        time: getTimeAgo(e.createdAt),
        userName: e.user.name,
        userId: e.userId,
        createdAt: e.createdAt.toISOString(),
        details: {
          eventType: e.eventType,
          productVariantId: e.task.productVariantId,
          sku: e.task.productVariant?.sku,
          productName: e.task.productVariant?.product.name,
          locationId: e.task.locationId,
          locationName: e.task.location?.name,
          previousValue: e.previousValue,
          newValue: e.newValue,
          notes: e.notes,
          metadata: e.metadata,
        },
        timestamp: e.createdAt,
      })),
    ];

    // ✅ Sort by timestamp and apply limit (not hardcoded!)
    const sortedActivities = allActivities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit) // ← Use the limit parameter
      .map(({ timestamp, ...rest }) => rest);

    // ✅ Handle CSV export
    if (format === "csv") {
      const csv = convertToCSV(sortedActivities);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=activity-log.csv",
        },
      });
    }

    return NextResponse.json(sortedActivities);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

function formatCountEvent(event: any): string {
  const eventType = event.eventType.replace(/_/g, " ").toLowerCase();
  const product = event.task.productVariant?.product.name || "location";

  switch (event.eventType) {
    case "COUNT_RECORDED":
      return `Count recorded for ${product}`;
    case "VARIANCE_NOTED":
      return `Variance detected on ${product}`;
    case "RECOUNT_REQUESTED":
      return `Recount requested for ${product}`;
    case "TASK_COMPLETED":
      return `Task completed on ${product}`;
    default:
      return `${eventType} on ${product}`;
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function convertToCSV(activities: any[]): string {
  if (activities.length === 0) return "";

  const headers = ["ID", "Type", "Message", "User", "Time", "Created At"];
  const rows = activities.map((a) => [
    a.id,
    a.type,
    a.message.replace(/"/g, '""'), // Escape quotes
    a.userName || "",
    a.time,
    a.createdAt,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
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

//     // Get recent inventory transactions
//     const transactions = await prisma.inventoryTransaction.findMany({
//       take: 5,
//       orderBy: { createdAt: "desc" },
//       include: {
//         productVariant: {
//           include: {
//             product: true,
//           },
//         },
//         location: true, // ← Add location
//         user: { select: { id: true, name: true } },
//       },
//     });

//     // Get recent orders
//     const recentOrders = await prisma.order.findMany({
//       take: 3,
//       orderBy: { createdAt: "desc" },
//     });

//     // Get recent cycle count events
//     const countEvents = await prisma.cycleCountEvent.findMany({
//       take: 3,
//       orderBy: { createdAt: "desc" },
//       include: {
//         user: { select: { id: true, name: true } },
//         task: {
//           include: {
//             productVariant: {
//               include: { product: true },
//             },
//             location: true, // ← Add location
//           },
//         },
//       },
//     });

//     // Combine all activities
//     const allActivities = [
//       // Inventory transactions
//       ...transactions.map((t) => ({
//         id: `txn-${t.id}`,
//         type: t.transactionType.toLowerCase(),
//         message: `${t.transactionType}: ${t.productVariant.product.name} (${
//           t.quantityChange > 0 ? "+" : ""
//         }${t.quantityChange})`,
//         time: getTimeAgo(t.createdAt),
//         userName: t.user?.name || "System",
//         userId: t.userId,
//         createdAt: t.createdAt.toISOString(), // ← Add this
//         details: {
//           productVariantId: t.productVariantId,
//           sku: t.productVariant.sku,
//           productName: t.productVariant.product.name,
//           locationId: t.locationId,
//           locationName: t.location?.name,
//           quantityChange: t.quantityChange,
//           referenceId: t.referenceId,
//           referenceType: t.referenceType,
//           notes: t.notes,
//           metadata: t.metadata,
//           // sourceLocation: t.sourceLocation,
//           transactionType: t.transactionType,
//         },
//         timestamp: t.createdAt,
//       })),

//       // Orders
//       ...recentOrders.map((o) => ({
//         id: `order-${o.id}`,
//         type: "order",
//         message: `New order ${o.orderNumber} from ${o.customerName}`,
//         time: getTimeAgo(o.createdAt),
//         userName: "Shopify",
//         userId: null,
//         createdAt: o.createdAt.toISOString(), // ← Add this
//         details: {
//           orderNumber: o.orderNumber,
//           customerName: o.customerName,
//           customerEmail: o.customerEmail,
//           totalAmount: o.totalAmount.toString(),
//           status: o.status,
//           shippingAddress: o.shippingAddress,
//         },
//         timestamp: o.createdAt,
//       })),

//       // Cycle count events
//       ...countEvents.map((e) => ({
//         id: `count-${e.id}`,
//         type: "scan",
//         message: formatCountEvent(e),
//         time: getTimeAgo(e.createdAt),
//         userName: e.user.name,
//         userId: e.userId,
//         createdAt: e.createdAt.toISOString(), // ← Add this
//         details: {
//           eventType: e.eventType,
//           productVariantId: e.task.productVariantId,
//           sku: e.task.productVariant?.sku,
//           productName: e.task.productVariant?.product.name,
//           locationId: e.task.locationId,
//           locationName: e.task.location?.name,
//           previousValue: e.previousValue,
//           newValue: e.newValue,
//           notes: e.notes,
//           metadata: e.metadata,
//         },
//         timestamp: e.createdAt,
//       })),
//     ];

//     // Sort by timestamp and take top 10
//     const sortedActivities = allActivities
//       .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
//       .slice(0, 10)
//       .map(({ timestamp, ...rest }) => rest); // Remove timestamp from response

//     return NextResponse.json(sortedActivities);
//   } catch (error) {
//     console.error("Error fetching activity:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch activity" },
//       { status: 500 }
//     );
//   }
// }

// function formatCountEvent(event: any): string {
//   const eventType = event.eventType.replace(/_/g, " ").toLowerCase();
//   const product = event.task.productVariant?.product.name || "location";

//   switch (event.eventType) {
//     case "COUNT_RECORDED":
//       return `Count recorded for ${product}`;
//     case "VARIANCE_NOTED":
//       return `Variance detected on ${product}`;
//     case "RECOUNT_REQUESTED":
//       return `Recount requested for ${product}`;
//     case "TASK_COMPLETED":
//       return `task completed on ${product}`;
//     default:
//       return `${eventType} on ${product}`;
//   }
// }

// function getTimeAgo(date: Date): string {
//   const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

//   if (seconds < 60) return `${seconds} sec ago`;
//   if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
//   if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
//   return `${Math.floor(seconds / 86400)} days ago`;
// }
