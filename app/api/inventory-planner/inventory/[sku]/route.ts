// app/api/inventory-planner/inventory/[sku]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { sku: string } }
) {
  try {
    const forecast = await prisma.forecastSuggestion.findUnique({
      where: { sku: params.sku },
    });

    if (!forecast) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Get matching product variant from WMS
    const productVariant = await prisma.productVariant.findUnique({
      where: { sku: params.sku },
      include: {
        product: true,
        inventory: {
          include: {
            location: true,
          },
        },
      },
    });

    // Get recent inventory transactions
    const recentTransactions = productVariant
      ? await prisma.inventoryTransaction.findMany({
          where: { productVariantId: productVariant.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            location: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        })
      : [];

    return NextResponse.json({
      success: true,
      data: {
        forecast,
        productVariant,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error("Error fetching inventory detail:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory detail" },
      { status: 500 }
    );
  }
}
