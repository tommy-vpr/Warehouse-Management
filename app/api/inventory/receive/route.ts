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

    const {
      productVariantId,
      locationId,
      quantity,
      reorderPoint,
      maxQuantity,
      notes,
    } = await request.json();

    if (!productVariantId || !locationId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Missing required fields or invalid quantity" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check if inventory record already exists for this product/location
      const existingInventory = await tx.inventory.findUnique({
        where: {
          productVariantId_locationId: {
            productVariantId,
            locationId,
          },
        },
      });

      let inventory;
      if (existingInventory) {
        // Update existing inventory
        inventory = await tx.inventory.update({
          where: { id: existingInventory.id },
          data: {
            quantityOnHand: existingInventory.quantityOnHand + quantity,
            reorderPoint: reorderPoint ?? existingInventory.reorderPoint,
            maxQuantity: maxQuantity ?? existingInventory.maxQuantity,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new inventory record
        inventory = await tx.inventory.create({
          data: {
            productVariantId,
            locationId,
            quantityOnHand: quantity,
            quantityReserved: 0,
            reorderPoint,
            maxQuantity,
          },
        });
      }

      // Create transaction record
      await tx.inventoryTransaction.create({
        data: {
          productVariantId,
          locationId,
          transactionType: "RECEIPT",
          quantityChange: quantity,
          userId: session.user.id,
          notes: notes || "Stock received",
          referenceType: "RECEIPT",
        },
      });

      return inventory;
    });

    return NextResponse.json({ success: true, inventory: result });
  } catch (error) {
    console.error("Error receiving inventory:", error);
    return NextResponse.json(
      { error: "Failed to receive inventory" },
      { status: 500 }
    );
  }
}
