import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LocationType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const simple = searchParams.get("simple") === "true";

    // Simple mode for dropdowns - no inventory data
    if (simple) {
      const locations = await prisma.location.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          zone: true,
          isPickable: true,
          isReceivable: true,
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(locations);
    }

    // Full mode with inventory
    const locations = await prisma.location.findMany({
      where: type ? { type: type as LocationType } : {},
      include: {
        inventory: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const locationsWithTotals = locations.map((location) => {
      const totalQuantity = location.inventory.reduce(
        (sum, inv) => sum + inv.quantityOnHand,
        0
      );
      const totalValue = location.inventory.reduce(
        (sum, inv) =>
          sum +
          inv.quantityOnHand * (Number(inv.productVariant.sellingPrice) || 0),
        0
      );

      return {
        ...location,
        totalQuantity,
        totalValue,
      };
    });

    return NextResponse.json(locationsWithTotals);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
