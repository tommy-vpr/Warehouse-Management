// app/api/inventory/route.ts
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
    const search = searchParams.get("search");
    const location = searchParams.get("location");
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    // Get inventory with all relations
    const inventoryRecords = await prisma.inventory.findMany({
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
        location: true,
      },
      where: {
        ...(search && {
          OR: [
            {
              productVariant: {
                sku: { contains: search, mode: "insensitive" },
              },
            },
            {
              productVariant: {
                upc: { contains: search, mode: "insensitive" },
              },
            },
            {
              productVariant: {
                product: { name: { contains: search, mode: "insensitive" } },
              },
            },
          ],
        }),
        ...(location !== "ALL" &&
          location && {
            location: { zone: location },
          }),
      },
    });

    // Group by product variant and aggregate locations
    const groupedInventory = inventoryRecords.reduce((acc, record) => {
      const key = record.productVariantId;

      if (!acc[key]) {
        acc[key] = {
          id: record.id,
          productVariantId: record.productVariantId,
          productName: record.productVariant.product.name,
          sku: record.productVariant.sku,
          upc: record.productVariant.upc,
          costPrice: record.productVariant.costPrice?.toString(),
          sellingPrice: record.productVariant.sellingPrice?.toString(),
          weight: record.productVariant.weight?.toNumber(),
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          reorderPoint: record.reorderPoint,
          maxQuantity: record.maxQuantity,
          locations: [],
          lastCounted: record.lastCounted,
          updatedAt: record.updatedAt,
          category: "GENERAL", // You may want to add this to your schema
          supplier: "Unknown", // You may want to add this to your schema
        };
      }

      // Aggregate quantities
      acc[key].quantityOnHand += record.quantityOnHand;
      acc[key].quantityReserved += record.quantityReserved;
      acc[key].quantityAvailable =
        acc[key].quantityOnHand - acc[key].quantityReserved;

      // Add location info
      acc[key].locations.push({
        locationId: record.locationId,
        locationName: record.location.name,
        quantity: record.quantityOnHand,
        zone: record.location.zone,
        aisle: record.location.aisle,
        shelf: record.location.shelf,
      });

      // Use most recent lastCounted
      if (
        record.lastCounted &&
        (!acc[key].lastCounted || record.lastCounted > acc[key].lastCounted)
      ) {
        acc[key].lastCounted = record.lastCounted;
      }

      return acc;
    }, {} as Record<string, any>);

    // Convert to array and calculate reorder status
    const inventory = Object.values(groupedInventory).map((item: any) => {
      let reorderStatus = "OK";

      if (item.quantityAvailable <= 0) {
        reorderStatus = "CRITICAL";
      } else if (
        item.reorderPoint &&
        item.quantityAvailable <= item.reorderPoint
      ) {
        reorderStatus = "LOW";
      } else if (item.maxQuantity && item.quantityOnHand >= item.maxQuantity) {
        reorderStatus = "OVERSTOCK";
      }

      return {
        ...item,
        reorderStatus,
      };
    });

    // Apply status filter
    const filteredInventory = inventory.filter((item) => {
      if (status === "ALL" || !status) return true;
      return item.reorderStatus === status;
    });

    // Calculate statistics
    const stats = {
      totalProducts: inventory.length,
      totalValue: inventory.reduce((sum, item) => {
        const cost = parseFloat(item.costPrice || "0");
        return sum + cost * item.quantityOnHand;
      }, 0),
      lowStock: inventory.filter((item) => item.reorderStatus === "LOW").length,
      outOfStock: inventory.filter((item) => item.reorderStatus === "CRITICAL")
        .length,
      overstock: inventory.filter((item) => item.reorderStatus === "OVERSTOCK")
        .length,
      recentTransactions: await prisma.inventoryTransaction.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    };

    return NextResponse.json({
      inventory: filteredInventory,
      stats,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
