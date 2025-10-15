// app/api/inventory/location/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const location = await prisma.location.findUnique({
      where: { id },
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
    console.error("Location fetch error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
