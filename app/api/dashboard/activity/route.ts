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

    const transactions = await prisma.inventoryTransaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        productVariant: { select: { sku: true } },
        user: { select: { name: true } },
      },
    });

    const activity = transactions.map((t) => ({
      id: t.id,
      type: t.transactionType.toLowerCase(),
      message: `${t.transactionType}: ${t.productVariant.sku} (${
        t.quantityChange > 0 ? "+" : ""
      }${t.quantityChange})`,
      time: getTimeAgo(t.createdAt),
    }));

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
