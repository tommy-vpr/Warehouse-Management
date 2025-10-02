// app/api/inventory/receive/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items, poNumber, userId } = body;

    const results = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of items) {
        // Update or create inventory record
        const inventory = await tx.inventory.upsert({
          where: {
            productVariantId_locationId: {
              productVariantId: item.productVariant.id,
              locationId: item.location.id,
            },
          },
          update: {
            quantityOnHand: {
              increment: item.quantityReceived,
            },
            updatedAt: new Date(),
          },
          create: {
            productVariantId: item.productVariant.id,
            locationId: item.location.id,
            quantityOnHand: item.quantityReceived,
            quantityReserved: 0,
          },
        });

        // Create inventory transaction record
        await tx.inventoryTransaction.create({
          data: {
            productVariantId: item.productVariant.id,
            locationId: item.location.id,
            transactionType: "RECEIPT",
            quantityChange: item.quantityReceived,
            referenceId: poNumber,
            referenceType: "PURCHASE_ORDER",
            userId: session.user.id,
            notes: item.notes,
          },
        });

        results.push({
          productVariantId: item.productVariant.id,
          locationId: item.location.id,
          quantityReceived: item.quantityReceived,
          newQuantityOnHand: inventory.quantityOnHand,
        });
      }

      return results;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully received ${items.length} items`,
      results,
    });
  } catch (error) {
    console.error("Batch receive error:", error);
    return NextResponse.json(
      { error: "Failed to receive inventory" },
      { status: 500 }
    );
  }
}
