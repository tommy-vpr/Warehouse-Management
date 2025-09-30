import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { poNumber, supplier, expectedDate, notes, items, totalCost } =
      await request.json();

    // Validate required fields
    if (!poNumber || !supplier || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create purchase order with items
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplier,
        status: "PENDING",
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        totalAmount: totalCost,
        items: {
          create: items.map((item: any) => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Create inventory transactions to mark reorder requests as processed
    for (const item of items) {
      await prisma.inventoryTransaction.create({
        data: {
          productVariantId: item.productVariantId,
          transactionType: "ADJUSTMENT",
          quantityChange: 0,
          referenceType: "PURCHASE_ORDER",
          referenceId: purchaseOrder.id,
          userId: session.user.id,
          notes: `PO created: ${poNumber} - ${supplier}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      message: "Purchase order created successfully",
    });
  } catch (error) {
    console.error("Error creating PO:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(purchaseOrders);
  } catch (error) {
    console.error("Error fetching POs:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}
