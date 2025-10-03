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

    // Get recent inventory transactions
    const transactions = await prisma.inventoryTransaction.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
        user: { select: { id: true, name: true } },
      },
    });

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
    });

    // Get recent cycle count events
    const countEvents = await prisma.cycleCountEvent.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        task: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
      },
    });

    // Combine all activities
    const allActivities = [
      // Inventory transactions
      ...transactions.map((t) => ({
        id: `txn-${t.id}`,
        type: t.transactionType.toLowerCase(),
        message: `${t.transactionType}: ${t.productVariant.product.name} (${
          t.quantityChange > 0 ? "+" : ""
        }${t.quantityChange})`,
        time: getTimeAgo(t.createdAt),
        userName: t.user?.name || "System",
        userId: t.userId,
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
        timestamp: e.createdAt,
      })),
    ];

    // Sort by timestamp and take top 10
    const sortedActivities = allActivities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
      .map(({ timestamp, ...rest }) => rest); // Remove timestamp from response

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
