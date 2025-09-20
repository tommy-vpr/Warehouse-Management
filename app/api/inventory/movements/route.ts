// app/aip / inventory / movements / route.ts;
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productVariantId,
      fromLocationId,
      toLocationId,
      quantity,
      reason,
      userId,
    } = body;

    const result = await prisma.$transaction(async (tx) => {
      // Verify source inventory exists and has enough quantity
      const sourceInventory = await tx.inventory.findUnique({
        where: {
          productVariantId_locationId: {
            productVariantId,
            locationId: fromLocationId,
          },
        },
      });

      if (!sourceInventory || sourceInventory.quantityOnHand < quantity) {
        throw new Error("Insufficient inventory at source location");
      }

      // Update source location (decrease)
      await tx.inventory.update({
        where: {
          productVariantId_locationId: {
            productVariantId,
            locationId: fromLocationId,
          },
        },
        data: {
          quantityOnHand: {
            decrement: quantity,
          },
        },
      });

      // Update destination location (increase)
      await tx.inventory.upsert({
        where: {
          productVariantId_locationId: {
            productVariantId,
            locationId: toLocationId,
          },
        },
        update: {
          quantityOnHand: {
            increment: quantity,
          },
        },
        create: {
          productVariantId,
          locationId: toLocationId,
          quantityOnHand: quantity,
          quantityReserved: 0,
        },
      });

      // Create inventory transactions
      await tx.inventoryTransaction.createMany({
        data: [
          {
            productVariantId,
            locationId: fromLocationId,
            transactionType: "TRANSFER",
            quantityChange: -quantity,
            referenceId: `${fromLocationId}-${toLocationId}`,
            referenceType: "LOCATION_TRANSFER",
            userId,
            notes: `Transfer to ${toLocationId}: ${reason}`,
          },
          {
            productVariantId,
            locationId: toLocationId,
            transactionType: "TRANSFER",
            quantityChange: quantity,
            referenceId: `${fromLocationId}-${toLocationId}`,
            referenceType: "LOCATION_TRANSFER",
            userId,
            notes: `Transfer from ${fromLocationId}: ${reason}`,
          },
        ],
      });

      return {
        fromLocationId,
        toLocationId,
        quantity,
        reason,
      };
    });

    return NextResponse.json({
      success: true,
      movement: result,
    });
  } catch (error) {
    console.error("Movement error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to move inventory",
      },
      { status: 500 }
    );
  }
}
