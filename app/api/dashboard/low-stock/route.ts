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

    const inventory = await prisma.inventory.findMany({
      include: {
        productVariant: {
          include: { product: true },
        },
        location: { select: { name: true } },
      },
    });

    const grouped = inventory.reduce((acc, inv) => {
      if (!acc[inv.productVariantId]) {
        acc[inv.productVariantId] = {
          sku: inv.productVariant.sku,
          name: inv.productVariant.product.name,
          current: 0,
          minimum: inv.reorderPoint || 0,
          locations: [],
        };
      }
      acc[inv.productVariantId].current += inv.quantityOnHand;
      acc[inv.productVariantId].locations.push(inv.location.name);
      return acc;
    }, {} as Record<string, any>);

    // const lowStockItems = Object.values(grouped)
    //   .filter((item: any) => item.current > 0 && item.current <= item.minimum)
    //   .slice(0, 5)
    //   .map((item: any) => ({
    //     sku: item.sku,
    //     name: item.name,
    //     current: item.current,
    //     minimum: item.minimum,
    //     location: item.locations[0] || "Unknown",
    //   }));

    const lowStockItems = Object.values(grouped)
      .filter((item: any) => item.current <= item.minimum) // Remove the > 0 check
      .slice(0, 10)
      .map((item: any) => ({
        sku: item.sku,
        name: item.name,
        current: item.current,
        minimum: item.minimum,
        location: item.locations[0] || "Unknown",
      }));

    return NextResponse.json(lowStockItems);
  } catch (error) {
    console.error("Error fetching low stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch low stock" },
      { status: 500 }
    );
  }
}
