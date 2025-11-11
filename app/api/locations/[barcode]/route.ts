// app/api/locations/[barcode]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  try {
    const { barcode } = await params;

    // Find location by barcode (which is the location name)
    const location = await prisma.location.findUnique({
      where: { barcode },
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

    // Format the response
    const locationData = {
      id: location.id,
      name: location.name,
      barcode: location.barcode,
      type: location.type,
      zone: location.zone,
      warehouseNumber: location.warehouseNumber,
      aisle: location.aisle,
      bay: location.bay,
      tier: location.tier,
      space: location.space,
      bin: location.bin,
      isPickable: location.isPickable,
      isReceivable: location.isReceivable,
      inventory: location.inventory.map((inv) => ({
        id: inv.id,
        quantityOnHand: inv.quantityOnHand,
        quantityReserved: inv.quantityReserved,
        quantityAvailable: inv.quantityOnHand - inv.quantityReserved,
        casesOnHand: inv.casesOnHand,
        casesReserved: inv.casesReserved,
        productVariant: {
          id: inv.productVariant.id,
          sku: inv.productVariant.sku,
          name: inv.productVariant.name,
          upc: inv.productVariant.upc,
          volume: inv.productVariant.volume,
          strength: inv.productVariant.strength,
          product: {
            id: inv.productVariant.product.id,
            name: inv.productVariant.product.name,
            brand: inv.productVariant.product.brand,
            category: inv.productVariant.product.category,
          },
        },
      })),
    };

    return NextResponse.json(locationData);
  } catch (error: any) {
    console.error("Error fetching location details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch location details" },
      { status: 500 }
    );
  }
}
