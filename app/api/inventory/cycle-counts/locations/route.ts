// app/api/inventory/cycle-counts/locations/route.ts
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
    const productVariantId = searchParams.get("productVariantId");

    console.log("Campaign locations API - Product ID:", productVariantId);

    // If filtering by product, get location IDs from inventory first
    let locationIdsForProduct: string[] | undefined;

    if (productVariantId) {
      const inventoryRecords = await prisma.inventory.findMany({
        where: {
          productVariantId: productVariantId,
          quantityOnHand: { gt: 0 },
        },
        select: {
          locationId: true,
        },
      });

      console.log("Inventory records found:", inventoryRecords.length);

      locationIdsForProduct = inventoryRecords.map((inv) => inv.locationId);

      console.log("Location IDs:", locationIdsForProduct);

      // If no inventory found for this product, return empty array
      if (locationIdsForProduct.length === 0) {
        return NextResponse.json([]);
      }
    }

    // Build where clause
    const where: any = {};

    // Add product filter if applicable
    if (locationIdsForProduct) {
      where.id = { in: locationIdsForProduct };
    }

    const locations = await prisma.location.findMany({
      where,
      orderBy: [
        { zone: "asc" },
        { aisle: "asc" },
        { shelf: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        type: true,
        zone: true,
        aisle: true,
        shelf: true,
        bin: true,
        isPickable: true,
        isReceivable: true,
        barcode: true,
      },
    });

    console.log("Locations returned:", locations.length);

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching campaign locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
