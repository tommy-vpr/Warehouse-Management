import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
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

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Format response
    const response = {
      poNumber: purchaseOrder.poNumber,
      supplier: purchaseOrder.supplier,
      status: purchaseOrder.status,
      expectedDate: purchaseOrder.expectedDate?.toISOString(),
      totalCost: parseFloat(purchaseOrder.totalAmount.toString()),
      createdAt: purchaseOrder.createdAt.toISOString(),
      createdBy: "Admin", // TODO: Add createdBy field to schema
      items: purchaseOrder.items.map((item) => ({
        productVariantId: item.productVariantId,
        productName: item.productVariant.product.name,
        sku: item.productVariant.sku,
        volume: item.productVariant.volume,
        strength: item.productVariant.strength,
        quantity: item.quantity,
        unitCost: parseFloat(item.unitCost.toString()),
        totalCost: parseFloat(item.totalCost.toString()),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching PO:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order" },
      { status: 500 }
    );
  }
}
