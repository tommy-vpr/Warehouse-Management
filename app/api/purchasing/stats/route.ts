import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Count pending reorder requests (excluding processed ones)
    const reorderTransactions = await prisma.inventoryTransaction.findMany({
      where: { referenceType: "REORDER_REQUEST" },
      select: { productVariantId: true },
    });

    const processedVariants = await prisma.inventoryTransaction.findMany({
      where: {
        referenceType: "PURCHASE_ORDER",
        productVariantId: {
          in: reorderTransactions.map((t) => t.productVariantId),
        },
      },
      select: { productVariantId: true },
      distinct: ["productVariantId"],
    });

    const processedVariantIds = new Set(
      processedVariants.map((t) => t.productVariantId)
    );
    const pendingReorders = reorderTransactions.filter(
      (t) => !processedVariantIds.has(t.productVariantId)
    ).length;

    // Get all inventory to calculate critical/low stock
    const inventory = await prisma.inventory.findMany({
      include: {
        productVariant: true,
      },
    });

    const openPurchaseOrders = await prisma.purchaseOrder.count({
      where: {
        status: { in: ["PENDING", "DRAFT"] },
      },
    });

    let criticalItems = 0;
    let lowStockItems = 0;
    let estimatedValue = 0;

    // Group by product variant
    const variantStock = inventory.reduce((acc, inv) => {
      if (!acc[inv.productVariantId]) {
        acc[inv.productVariantId] = {
          total: 0,
          reorderPoint: inv.reorderPoint || 0,
          costPrice: parseFloat(
            inv.productVariant.costPrice?.toString() || "0"
          ),
        };
      }
      acc[inv.productVariantId].total += inv.quantityOnHand;
      return acc;
    }, {} as Record<string, { total: number; reorderPoint: number; costPrice: number }>);

    Object.values(variantStock).forEach((item) => {
      if (item.total <= 0) {
        criticalItems++;
      } else if (item.total <= item.reorderPoint) {
        lowStockItems++;
      }

      if (item.total < item.reorderPoint) {
        const qtyNeeded = item.reorderPoint * 2 - item.total;
        estimatedValue += qtyNeeded * item.costPrice;
      }
    });

    // Count suppliers needed (unique suppliers with pending reorders)
    const suppliersNeeded = await prisma.inventoryTransaction.findMany({
      where: { referenceType: "REORDER_REQUEST" },
      include: {
        productVariant: {
          select: { supplier: true },
        },
      },
      distinct: ["productVariantId"],
    });

    const uniqueSuppliers = new Set(
      suppliersNeeded.map((t) => t.productVariant.supplier).filter(Boolean)
    );

    return NextResponse.json({
      pendingReorders,
      criticalItems,
      lowStockItems,
      openPurchaseOrders, // TODO: Add when PO system is built
      estimatedValue: Math.round(estimatedValue),
      suppliersNeeded: uniqueSuppliers.size,
    });
  } catch (error) {
    console.error("Error fetching purchasing stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
