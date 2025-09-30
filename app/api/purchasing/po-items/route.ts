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
    const ids = searchParams.get("ids")?.split(",") || [];

    if (ids.length === 0) {
      return NextResponse.json([]);
    }

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: ids } },
      include: {
        product: true,
        inventory: true,
      },
    });

    const items = variants.map((variant) => {
      const totalStock = variant.inventory.reduce(
        (sum, inv) => sum + inv.quantityOnHand,
        0
      );
      const reorderPoint = variant.inventory[0]?.reorderPoint || 50;
      const suggestedQuantity = Math.max(
        reorderPoint * 2 - totalStock,
        reorderPoint
      );

      return {
        productVariantId: variant.id,
        productName: variant.product.name,
        sku: variant.sku,
        volume: variant.volume,
        strength: variant.strength,
        currentStock: totalStock,
        reorderPoint,
        suggestedQuantity,
        costPrice: variant.costPrice?.toString() || "0",
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching PO items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}
