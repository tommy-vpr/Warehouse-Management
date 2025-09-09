import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    // Look up product variant by UPC or SKU
    const productVariant = await prisma.productVariant.findFirst({
      where: {
        OR: [{ upc: code }, { sku: code }],
      },
      include: {
        product: true,
        inventory: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!productVariant) {
      return NextResponse.json(
        { error: "Product not found", code },
        { status: 404 }
      );
    }

    // Calculate totals
    const totalQuantity = productVariant.inventory.reduce(
      (sum, inv) => sum + inv.quantityOnHand,
      0
    );
    const totalReserved = productVariant.inventory.reduce(
      (sum, inv) => sum + inv.quantityReserved,
      0
    );
    const totalAvailable = totalQuantity - totalReserved;

    const response = {
      productVariant: {
        ...productVariant,
        inventory: productVariant.inventory.map((inv) => ({
          ...inv,
          quantityAvailable: Math.max(
            0,
            inv.quantityOnHand - inv.quantityReserved
          ),
        })),
      },
      totalQuantity,
      totalReserved,
      totalAvailable,
      locations: productVariant.inventory.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error looking up product:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to lookup product";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
