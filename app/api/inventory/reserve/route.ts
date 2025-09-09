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

      const availableQuantity =
        inventory.quantityOnHand - inventory.quantityReserved;

      if (availableQuantity < quantity) {
        throw new Error(
          `Insufficient inventory. Available: ${availableQuantity}, Requested: ${quantity}`
        );
      }

      // Reserve the inventory
      const updatedInventory = await tx.inventory.update({
        where: {
          productVariantId_locationId: {
            productVariantId,
            locationId,
          },
        },
        data: {
          quantityReserved: {
            increment: quantity,
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

      // Create transaction record
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productVariantId,
          locationId,
          transactionType: "ALLOCATION",
          quantityChange: -quantity, // Negative because it reduces available inventory
          referenceId: orderId,
          referenceType: "ORDER",
          userId: session.user.id,
          notes:
            notes ||
            `Reserved ${quantity} units${
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
    console.error("Error reserving inventory:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to reserve inventory";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
