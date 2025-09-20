// app/api/inventory/location/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const barcode = searchParams.get("barcode");

  console.log("LOCATION_BARCODE: ", barcode);

  if (!barcode) {
    return NextResponse.json({ error: "Barcode required" }, { status: 400 });
  }

  try {
    // Assuming locations have barcodes in the 'name' field or a separate barcode field
    const location = await prisma.location.findFirst({
      where: {
        OR: [
          //   { name: barcode },
          // Add a barcode field to Location model if needed
          { barcode: barcode },
        ],
      },
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

    return NextResponse.json({
      id: location.id,
      name: location.name,
      type: location.type,
      zone: location.zone,
      aisle: location.aisle,
      shelf: location.shelf,
      bin: location.bin,
      isPickable: location.isPickable,
      isReceivable: location.isReceivable,
      currentInventory: location.inventory.map((inv) => ({
        productVariantId: inv.productVariantId,
        sku: inv.productVariant.sku,
        productName: inv.productVariant.product.name,
        quantityOnHand: inv.quantityOnHand,
        quantityReserved: inv.quantityReserved,
      })),
    });
  } catch (error) {
    console.error("Location lookup error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
