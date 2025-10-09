import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: any = {
      transactionType: "TRANSFER",
      referenceType: {
        in: ["TRANSFER_PENDING", "TRANSFER_APPROVED", "TRANSFER_REJECTED"],
      },
    };

    // Date filters
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Fetch transfers
    const transfers = await prisma.inventoryTransaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        productVariant: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter by status if provided
    let filteredTransfers = transfers;
    if (status && status !== "ALL") {
      filteredTransfers = transfers.filter((t) => {
        const metadata = t.metadata as any;
        return metadata?.status === status;
      });
    }

    return NextResponse.json(filteredTransfers);
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}
