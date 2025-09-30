// app/api/locations/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location, skus } = body;

    // Validate required data
    if (!location || !skus || skus.length === 0) {
      return NextResponse.json(
        { error: "Location and SKUs data are required" },
        { status: 400 }
      );
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if location already exists
      let existingLocation = await tx.location.findUnique({
        where: { name: location.name },
      });

      let createdLocation;

      if (existingLocation) {
        // Update existing location
        createdLocation = await tx.location.update({
          where: { name: location.name },
          data: {
            warehouseNumber: location.warehouseNumber,
            aisle: location.aisle,
            bay: location.bay,
            tier: location.tier,
            space: location.space,
            bin: location.bin,
            barcode: location.barcode,
            type: location.type,
            zone: location.zone,
            isPickable: location.isPickable,
            isReceivable: location.isReceivable,
          },
        });
      } else {
        // Create new location
        createdLocation = await tx.location.create({
          data: {
            name: location.name,
            warehouseNumber: location.warehouseNumber,
            aisle: location.aisle,
            bay: location.bay,
            tier: location.tier,
            space: location.space,
            bin: location.bin,
            barcode: location.barcode,
            type: location.type,
            zone: location.zone,
            isPickable: location.isPickable,
            isReceivable: location.isReceivable,
          },
        });
      }

      // Create inventory records for each SKU at this location
      const inventoryRecords = [];

      for (const sku of skus) {
        // Find the product variant by SKU
        const productVariant = await tx.productVariant.findUnique({
          where: { sku: sku },
        });

        if (!productVariant) {
          console.warn(
            `Product variant with SKU ${sku} not found, skipping inventory creation`
          );
          continue;
        }

        // Check if inventory record already exists
        const existingInventory = await tx.inventory.findUnique({
          where: {
            productVariantId_locationId: {
              productVariantId: productVariant.id,
              locationId: createdLocation.id,
            },
          },
        });

        if (existingInventory) {
          // Update existing inventory (keep quantities as-is)
          const updated = await tx.inventory.update({
            where: {
              productVariantId_locationId: {
                productVariantId: productVariant.id,
                locationId: createdLocation.id,
              },
            },
            data: {
              // You could update quantities here if needed
              // For now, we just ensure the record exists
            },
          });
          inventoryRecords.push(updated);
        } else {
          // Create new inventory record with initial quantity 0
          const created = await tx.inventory.create({
            data: {
              productVariantId: productVariant.id,
              locationId: createdLocation.id,
              quantityOnHand: 0,
              quantityReserved: 0,
              casesOnHand: 0,
              casesReserved: 0,
            },
          });
          inventoryRecords.push(created);
        }
      }

      return {
        location: createdLocation,
        inventoryCount: inventoryRecords.length,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported location with ${result.inventoryCount} inventory records`,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Location import error:", error);

    // Handle specific Prisma errors
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate location name or barcode detected" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to import location" },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve locations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (name) {
      const location = await prisma.location.findUnique({
        where: { name },
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
      });

      if (!location) {
        return NextResponse.json(
          { error: "Location not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ location }, { status: 200 });
    }

    // Return summary of all locations
    const locationCount = await prisma.location.count();
    const inventoryCount = await prisma.inventory.count();

    return NextResponse.json(
      {
        summary: {
          totalLocations: locationCount,
          totalInventoryRecords: inventoryCount,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
