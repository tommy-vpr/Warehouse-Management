// app/api/backorders/[id]/fulfill/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/order-status-helper";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the back order with full details
    const backOrder = await prisma.backOrder.findUnique({
      where: { id },
      include: {
        order: true,
        productVariant: {
          include: {
            inventory: {
              include: {
                location: true,
              },
            },
          },
        },
      },
    });

    if (!backOrder) {
      return NextResponse.json(
        { error: "Back order not found" },
        { status: 404 }
      );
    }

    if (backOrder.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `Back order is not pending (current status: ${backOrder.status})`,
        },
        { status: 400 }
      );
    }

    const remainingNeeded =
      backOrder.quantityBackOrdered - backOrder.quantityFulfilled;

    console.log(
      `📦 Allocating back order ${id}: Need ${remainingNeeded} units`
    );

    // Check if we have enough inventory
    const inventoryLocations = backOrder.productVariant.inventory
      .map((inv) => ({
        ...inv,
        quantityAvailable: inv.quantityOnHand - inv.quantityReserved,
      }))
      .filter((inv) => inv.quantityAvailable > 0)
      .sort((a, b) => b.quantityAvailable - a.quantityAvailable);

    const totalAvailable = inventoryLocations.reduce(
      (sum, inv) => sum + inv.quantityAvailable,
      0
    );

    console.log(`📊 Total available inventory: ${totalAvailable} units`);
    console.log(
      `📍 Available locations:`,
      inventoryLocations.map(
        (l) => `${l.location.name}: ${l.quantityAvailable}`
      )
    );

    if (totalAvailable < remainingNeeded) {
      return NextResponse.json(
        {
          error: "Insufficient inventory",
          message: `Need ${remainingNeeded} units, only ${totalAvailable} available`,
          details: {
            needed: remainingNeeded,
            available: totalAvailable,
            locations: inventoryLocations.length,
          },
        },
        { status: 400 }
      );
    }

    // Allocate the back order in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let remaining = remainingNeeded;
      const allocations = [];

      // Reserve inventory from available locations
      for (const inventory of inventoryLocations) {
        if (remaining <= 0) break;

        const qty = Math.min(remaining, inventory.quantityAvailable);

        console.log(
          `  ✅ Allocating ${qty} units from ${inventory.location.name}`
        );

        // ✅ FIXED: Check if reservation already exists
        const existingReservation = await tx.inventoryReservation.findUnique({
          where: {
            orderId_productVariantId_locationId: {
              orderId: backOrder.orderId,
              productVariantId: backOrder.productVariantId,
              locationId: inventory.locationId,
            },
          },
        });

        if (existingReservation) {
          // Update existing reservation
          await tx.inventoryReservation.update({
            where: { id: existingReservation.id },
            data: {
              quantity: existingReservation.quantity + qty,
              status: "ACTIVE",
            },
          });
        } else {
          // Create new reservation
          await tx.inventoryReservation.create({
            data: {
              orderId: backOrder.orderId,
              productVariantId: backOrder.productVariantId,
              locationId: inventory.locationId,
              quantity: qty,
              status: "ACTIVE",
            },
          });
        }

        // Reserve inventory
        await tx.inventory.update({
          where: {
            productVariantId_locationId: {
              productVariantId: backOrder.productVariantId,
              locationId: inventory.locationId,
            },
          },
          data: {
            quantityReserved: {
              increment: qty,
            },
          },
        });

        // Create inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            productVariantId: backOrder.productVariantId,
            locationId: inventory.locationId,
            transactionType: "ALLOCATION",
            quantityChange: -qty,
            referenceId: backOrder.orderId,
            referenceType: "BACKORDER_ALLOCATION",
            userId: session.user.id,
            notes: `Back order allocation - Reserved ${qty} units for order ${backOrder.order.orderNumber}`,
          },
        });

        allocations.push({
          location: inventory.location.name,
          quantity: qty,
        });

        remaining -= qty;
      }

      // ✅ Update back order status to ALLOCATED (not FULFILLED)
      await tx.backOrder.update({
        where: { id },
        data: {
          status: "ALLOCATED",
        },
      });

      // Check if all back orders for this order are now allocated
      const allBackOrders = await tx.backOrder.findMany({
        where: { orderId: backOrder.orderId },
      });

      const allAllocated = allBackOrders.every((bo) => bo.status !== "PENDING");

      if (allAllocated) {
        console.log(
          `✅ All back orders allocated for order ${backOrder.order.orderNumber}`
        );

        // Update order status to ALLOCATED
        await updateOrderStatus({
          orderId: backOrder.orderId,
          newStatus: "ALLOCATED",
          userId: session.user.id,
          notes: `All back orders allocated - Ready for picking`,
          tx,
        });

        // Remove hasBackOrders flag since they're now allocated
        await tx.order.update({
          where: { id: backOrder.orderId },
          data: {
            hasBackOrders: false,
          },
        });
      } else {
        console.log(
          `⏳ Order ${backOrder.order.orderNumber} still has pending back orders`
        );
      }

      return { allocations, allAllocated };
    });

    console.log(`✅ Back order ${id} allocated successfully`);

    return NextResponse.json({
      success: true,
      message: "Back order allocated successfully - ready for picking",
      allocations: result.allocations,
      allAllocated: result.allAllocated,
    });
  } catch (error) {
    console.error("❌ Error allocating back order:", error);

    // ✅ Enhanced error logging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to allocate back order",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
