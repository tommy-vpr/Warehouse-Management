import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleApiError } from "@/lib/error-handler";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inventoryItems } = await request.json();

    if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
      return NextResponse.json(
        { error: "Invalid inventory data" },
        { status: 400 }
      );
    }

    const results = await prisma.$transaction(async (tx) => {
      const createdItems = [];

      for (const item of inventoryItems) {
        const {
          productVariantId,
          locationId,
          quantity,
          reorderPoint,
          maxQuantity,
        } = item;

        // Validate required fields
        if (!productVariantId || !locationId || quantity === undefined) {
          throw new Error(
            `Missing required fields for item: ${JSON.stringify(item)}`
          );
        }

        // Check if inventory exists
        const existing = await tx.inventory.findUnique({
          where: {
            productVariantId_locationId: {
              productVariantId,
              locationId,
            },
          },
        });

        let inventory;
        if (existing) {
          // Update existing
          inventory = await tx.inventory.update({
            where: { id: existing.id },
            data: {
              quantityOnHand: existing.quantityOnHand + quantity,
              reorderPoint: reorderPoint ?? existing.reorderPoint,
              maxQuantity: maxQuantity ?? existing.maxQuantity,
            },
          });
        } else {
          // Create new
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

        // Create transaction
        await tx.inventoryTransaction.create({
          data: {
            productVariantId,
            locationId,
            transactionType: "RECEIPT",
            quantityChange: quantity,
            userId: session.user.id,
            notes: "Bulk import",
            referenceType: "BULK_IMPORT",
          },
        });

        createdItems.push(inventory);
      }

      return createdItems;
    });

    return NextResponse.json({
      success: true,
      imported: results.length,
      items: results,
    });
  } catch (error) {
    const appError = handleApiError(error);
    console.error("Error importing inventory:", error);
    return NextResponse.json(
      { error: appError.message || "Failed to import inventory" },
      { status: 500 }
    );
  }
}
