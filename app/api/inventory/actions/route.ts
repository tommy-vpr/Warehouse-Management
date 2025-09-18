// app/api/inventory/actions/route.ts
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

    const { action, itemId, quantity } = await request.json();

    switch (action) {
      case "ADJUST":
        // Find the inventory record
        const inventoryRecord = await prisma.inventory.findUnique({
          where: { id: itemId },
          include: { productVariant: true, location: true },
        });

        if (!inventoryRecord) {
          return NextResponse.json(
            { error: "Inventory item not found" },
            { status: 404 }
          );
        }

        // Update inventory
        await prisma.inventory.update({
          where: { id: itemId },
          data: {
            quantityOnHand: {
              increment: quantity,
            },
          },
        });

        // Create transaction record
        await prisma.inventoryTransaction.create({
          data: {
            productVariantId: inventoryRecord.productVariantId,
            locationId: inventoryRecord.locationId,
            transactionType: quantity > 0 ? "ADJUSTMENT" : "ADJUSTMENT",
            quantityChange: quantity,
            referenceType: "MANUAL_ADJUSTMENT",
            userId: session.user.id,
            notes: `Manual adjustment: ${quantity > 0 ? "+" : ""}${quantity}`,
          },
        });

        break;

      case "REORDER":
        // This would integrate with your purchasing system
        // For now, just log the reorder request
        console.log(`Reorder requested for item ${itemId}`);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error performing inventory action:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
