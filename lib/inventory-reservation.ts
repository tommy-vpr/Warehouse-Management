import { prisma } from "./prisma";

export interface ReservationRequest {
  productVariantId: string;
  locationId: string;
  quantity: number;
  orderId?: string;
  notes?: string;
}

export interface ReservationResult {
  success: boolean;
  reserved: number;
  available: number;
  error?: string;
}

export async function reserveInventory(
  request: ReservationRequest,
  userId: string
): Promise<ReservationResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: {
          productVariantId_locationId: {
            productVariantId: request.productVariantId,
            locationId: request.locationId,
          },
        },
      });

      if (!inventory) {
        throw new Error("Inventory location not found");
      }

      const available = inventory.quantityOnHand - inventory.quantityReserved;

      if (available < request.quantity) {
        return {
          success: false,
          reserved: 0,
          available,
          error: `Insufficient inventory. Available: ${available}, Requested: ${request.quantity}`,
        };
      }

      await tx.inventory.update({
        where: {
          productVariantId_locationId: {
            productVariantId: request.productVariantId,
            locationId: request.locationId,
          },
        },
        data: {
          quantityReserved: {
            increment: request.quantity,
          },
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          productVariantId: request.productVariantId,
          locationId: request.locationId,
          transactionType: "ALLOCATION",
          quantityChange: -request.quantity,
          referenceId: request.orderId,
          referenceType: "ORDER",
          userId,
          notes: request.notes,
        },
      });

      return {
        success: true,
        reserved: request.quantity,
        available: available - request.quantity,
      };
    });

    return result;
  } catch (error) {
    return {
      success: false,
      reserved: 0,
      available: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getOrderReservations(orderId: string) {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      referenceId: orderId,
      referenceType: "ORDER",
      transactionType: "ALLOCATION",
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

  return transactions.map((t) => ({
    id: t.id,
    productVariant: t.productVariant,
    location: t.location,
    quantity: Math.abs(t.quantityChange),
    createdAt: t.createdAt,
    notes: t.notes,
  }));
}
