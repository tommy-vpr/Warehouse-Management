// app/api/inventory/po-barcode/scan-product/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { upc, sku } = body; // Can scan by UPC or manually enter SKU

    if (!upc && !sku) {
      return NextResponse.json(
        { error: "UPC or SKU required" },
        { status: 400 }
      );
    }

    // Look up product by UPC or SKU
    let variant;

    if (upc) {
      variant = await prisma.productVariant.findFirst({
        where: {
          OR: [{ upc: upc.trim() }, { barcode: upc.trim() }],
        },
        select: {
          id: true,
          sku: true,
          name: true,
          upc: true,
          barcode: true,
        },
      });
    } else if (sku) {
      variant = await prisma.productVariant.findUnique({
        where: { sku: sku.trim() },
        select: {
          id: true,
          sku: true,
          name: true,
          upc: true,
          barcode: true,
        },
      });
    }

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
          scannedValue: upc || sku,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product: variant,
      message: "Product found",
    });
  } catch (error: any) {
    console.error("❌ Failed to scan product:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
