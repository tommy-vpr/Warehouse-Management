// app/api/inventory/product/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const barcode = searchParams.get("barcode");

  if (!barcode) {
    return NextResponse.json({ error: "Barcode required" }, { status: 400 });
  }

  try {
    // Search by UPC, SKU, or barcode field
    const productVariant = await prisma.productVariant.findFirst({
      where: {
        OR: [
          { upc: barcode },
          { sku: barcode },
          { barcode: barcode }, // Your new barcode field
        ],
      },
      include: {
        product: {
          select: {
            name: true,
            category: true,
            brand: true,
          },
        },
        inventory: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!productVariant) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: productVariant.id,
      sku: productVariant.sku,
      upc: productVariant.upc,
      barcode: productVariant.barcode,
      name: productVariant.name,
      productName: productVariant.product.name,
      category: productVariant.category || productVariant.product.category,
      brand: productVariant.product.brand,
      supplier: productVariant.supplier,
      inventory: productVariant.inventory.map((inv) => ({
        locationId: inv.locationId,
        locationName: inv.location.name,
        quantityOnHand: inv.quantityOnHand,
        quantityReserved: inv.quantityReserved,
      })),
    });
  } catch (error) {
    console.error("Product lookup error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
