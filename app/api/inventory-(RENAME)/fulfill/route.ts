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
    const { productVariantId, locationId, quantity, orderId, notes } = body;

    // Validate required fields
    if (!productVariantId || !locationId || !quantity || quantity <= 0) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid required fields: productVariantId, locationId, quantity",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get current inventory
      const inventory = await tx.inventory.findUnique({
        where: {
          productVariantId_locationId: {
            productVariantId,
            locationId,
          },
        },
        include: {
          productVariant: {
            include: {
              product: true,
            },
          },
          location: true,
        },
      });

      if (!inventory) {
        throw new Error("Inventory location not found");
      }

      if (inventory.quantityReserved < quantity) {
        throw new Error(
          `Cannot fulfill more than reserved. Reserved: ${inventory.quantityReserved}, Requested: ${quantity}`
        );
      }

      if (inventory.quantityOnHand < quantity) {
        throw new Error(
          `Insufficient physical inventory. On Hand: ${inventory.quantityOnHand}, Requested: ${quantity}`
        );
      }

      // Fulfill the order - reduce both on hand and reserved
      const updatedInventory = await tx.inventory.update({
        where: {
          productVariantId_locationId: {
            productVariantId,
            locationId,
          },
        },
        data: {
          quantityOnHand: {
            decrement: quantity,
          },
          quantityReserved: {
            decrement: quantity,
          },
        },
        include: {
          productVariant: {
            include: {
              product: true,
            },
          },
          location: true,
        },
      });

      // Create transaction record for the sale/fulfillment
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productVariantId,
          locationId,
          transactionType: "SALE",
          quantityChange: -quantity, // Negative because inventory is leaving
          referenceId: orderId,
          referenceType: "ORDER",
          userId: session.user.id,
          notes:
            notes ||
            `Fulfilled ${quantity} units${
              orderId ? ` for order ${orderId}` : ""
            }`,
        },
      });

      return {
        inventory: {
          ...updatedInventory,
          quantityAvailable:
            updatedInventory.quantityOnHand - updatedInventory.quantityReserved,
        },
        transaction,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fulfilling inventory:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to fulfill inventory";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
