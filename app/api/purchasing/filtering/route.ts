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
    const search = searchParams.get("search") || "";
    const locationFilter = searchParams.get("location") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";
    const categoryFilter = searchParams.get("category") || "ALL";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build where clause for database query
    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { productVariant: { sku: { contains: search, mode: "insensitive" } } },
        { productVariant: { upc: { contains: search, mode: "insensitive" } } },
        {
          productVariant: {
            product: { name: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    // Category filter
    if (categoryFilter !== "ALL") {
      where.productVariant = {
        ...(where.productVariant || {}),
        category: categoryFilter,
      };
    }

    // Location filter
    if (locationFilter !== "ALL") {
      where.location = {
        zone: { contains: locationFilter, mode: "insensitive" },
      };
    }

    // Fetch and aggregate inventory in one query
    const allInventory = await prisma.inventory.findMany({
      where,
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
        location: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    // Group by product variant and aggregate
    const variantMap = allInventory.reduce((acc, inv) => {
      const variantId = inv.productVariantId;

      if (!acc.has(variantId)) {
        acc.set(variantId, {
          productVariantId: variantId,
          productName: inv.productVariant.product.name,
          sku: inv.productVariant.sku,
          upc: inv.productVariant.upc || undefined,
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          reorderPoint: inv.reorderPoint || undefined,
          maxQuantity: inv.maxQuantity || undefined,
          costPrice: inv.productVariant.costPrice?.toString(),
          sellingPrice: inv.productVariant.sellingPrice?.toString(),
          weight: inv.productVariant.weight
            ? parseFloat(inv.productVariant.weight.toString())
            : undefined,
          category: inv.productVariant.category || undefined,
          supplier: inv.productVariant.supplier || undefined,
          locations: [],
          lastCounted: inv.lastCounted?.toISOString(),
          reorderStatus: "OK",
          updatedAt: inv.updatedAt.toISOString(),
        });
      }

      const variant = acc.get(variantId)!;

      // Aggregate quantities
      variant.quantityOnHand += inv.quantityOnHand;
      variant.quantityReserved += inv.quantityReserved;
      variant.quantityAvailable =
        variant.quantityOnHand - variant.quantityReserved;

      // Add location
      variant.locations.push({
        locationId: inv.locationId,
        locationName: inv.location.name,
        quantity: inv.quantityOnHand,
        zone: inv.location.zone,
        aisle: inv.location.aisle,
        shelf: inv.location.shelf,
      });

      // Update last counted
      if (
        inv.lastCounted &&
        (!variant.lastCounted ||
          new Date(inv.lastCounted) > new Date(variant.lastCounted))
      ) {
        variant.lastCounted = inv.lastCounted.toISOString();
      }

      return acc;
    }, new Map<string, any>());

    // Calculate reorder status for each variant
    let inventoryWithStatus = Array.from(variantMap.values()).map((item) => {
      let status = "OK";

      if (item.quantityOnHand === 0) {
        status = "CRITICAL";
      } else if (
        item.reorderPoint &&
        item.quantityOnHand <= item.reorderPoint
      ) {
        status = "LOW";
      } else if (item.maxQuantity && item.quantityOnHand >= item.maxQuantity) {
        status = "OVERSTOCK";
      }

      return {
        ...item,
        inventoryId: item.productVariantId,
        reorderStatus: status,
      };
    });

    // Apply status filter AFTER calculating status
    if (statusFilter !== "ALL") {
      inventoryWithStatus = inventoryWithStatus.filter(
        (item) => item.reorderStatus === statusFilter
      );
    }

    // Calculate statistics
    const stats = {
      totalProducts: variantMap.size,
      totalValue: inventoryWithStatus.reduce((sum, item) => {
        const cost = parseFloat(item.costPrice || "0");
        return sum + cost * item.quantityOnHand;
      }, 0),
      lowStock: inventoryWithStatus.filter(
        (item) => item.reorderStatus === "LOW"
      ).length,
      outOfStock: inventoryWithStatus.filter(
        (item) => item.reorderStatus === "CRITICAL"
      ).length,
      overstock: inventoryWithStatus.filter(
        (item) => item.reorderStatus === "OVERSTOCK"
      ).length,
      recentTransactions: await prisma.inventoryTransaction.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    };

    // Pagination
    const totalCount = inventoryWithStatus.length;
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;
    const paginatedInventory = inventoryWithStatus.slice(skip, skip + limit);

    return NextResponse.json({
      inventory: paginatedInventory,
      stats,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
