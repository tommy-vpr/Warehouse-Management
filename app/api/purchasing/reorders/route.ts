import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const showProcessed = searchParams.get("showProcessed") === "true";
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;

    // Get all REORDER_REQUEST transactions
    const reorderTransactions = await prisma.inventoryTransaction.findMany({
      where: {
        referenceType: "REORDER_REQUEST",
      },
      include: {
        productVariant: {
          include: {
            product: true,
            inventory: {
              select: {
                quantityOnHand: true,
                reorderPoint: true,
              },
            },
          },
        },
        user: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get product variants that have been converted to POs
    const variantIds = reorderTransactions.map((t) => t.productVariantId);

    const processedVariants = await prisma.inventoryTransaction.findMany({
      where: {
        referenceType: "PURCHASE_ORDER",
        productVariantId: { in: variantIds },
      },
      select: { productVariantId: true },
      distinct: ["productVariantId"],
    });

    const processedVariantIds = new Set(
      processedVariants.map((t) => t.productVariantId)
    );

    // Filter based on showProcessed parameter (default: hide processed)
    const filteredTransactions = showProcessed
      ? reorderTransactions
      : reorderTransactions.filter(
          (trans) => !processedVariantIds.has(trans.productVariantId)
        );

    // Transform to response format
    const formatted = filteredTransactions.map((req) => {
      const totalStock = req.productVariant.inventory.reduce(
        (sum, inv) => sum + inv.quantityOnHand,
        0
      );
      const reorderPoint = req.productVariant.inventory[0]?.reorderPoint || 0;

      // Extract suggested quantity from notes
      const suggestedQty =
        parseInt(req.notes?.match(/quantity: (\d+)/)?.[1] || "0") ||
        reorderPoint * 2;

      return {
        id: req.id,
        productVariantId: req.productVariantId,
        productName: req.productVariant.product.name,
        sku: req.productVariant.sku,
        volume: req.productVariant.volume,
        strength: req.productVariant.strength,
        currentStock: totalStock,
        reorderPoint,
        suggestedQuantity: suggestedQty,
        supplier: req.productVariant.supplier,
        notes: req.notes || "",
        createdAt: req.createdAt.toISOString(),
        requestedBy: req.user?.name || "System",
        hasBeenOrdered: processedVariantIds.has(req.productVariantId),
      };
    });

    // Apply limit if specified
    const result = limit ? formatted.slice(0, limit) : formatted;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching reorder requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch reorder requests" },
      { status: 500 }
    );
  }
}
