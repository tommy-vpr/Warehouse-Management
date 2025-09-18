// app/api/picking/items/[id]/pick/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface PickItemRequest {
  action: "PICK" | "SHORT_PICK" | "SKIP";
  quantityPicked?: number;
  reason?: string;
  location?: string;
  notes?: string;
}

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: PickItemRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { action, quantityPicked, reason, location, notes } = body;
    if (!["PICK", "SHORT_PICK", "SKIP"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const pickListItem = await prisma.pickListItem.findUnique({
      where: { id },
      include: {
        pickList: true,
        productVariant: {
          include: {
            inventory: {
              //   where: { locationId: { not: null } },
              include: { location: true },
            },
          },
        },
        order: { select: { orderNumber: true } },
        location: true,
      },
    });

    if (!pickListItem)
      return NextResponse.json(
        { error: "Pick list item not found" },
        { status: 404 }
      );
    if (pickListItem.pickList.status !== "IN_PROGRESS")
      return NextResponse.json(
        { error: "Pick list is not in progress" },
        { status: 400 }
      );
    if (pickListItem.status !== "PENDING")
      return NextResponse.json(
        { error: "Item already processed" },
        { status: 400 }
      );

    const reqQty = Number.isFinite(quantityPicked)
      ? Math.max(0, Math.floor(quantityPicked!))
      : undefined;

    const result = await prisma.$transaction(async (tx) => {
      let newStatus: "PICKED" | "SHORT_PICK" | "SKIPPED";
      let actual = 0;

      if (action === "PICK") {
        newStatus = "PICKED";
        actual = reqQty ?? pickListItem.quantityToPick ?? 0;
      } else if (action === "SHORT_PICK") {
        newStatus = "SHORT_PICK";
        actual = reqQty ?? 0;
      } else {
        newStatus = "SKIPPED";
        actual = 0;
      }

      actual = Math.min(actual, pickListItem.quantityToPick || 0);

      const updatedItem = await tx.pickListItem.update({
        where: { id },
        data: {
          status: newStatus,
          quantityPicked: actual,
          pickedAt: new Date(),
          pickedBy: session.user.id,
          shortPickReason: action === "SHORT_PICK" ? reason ?? null : null,
          notes: notes ?? null,
        },
      });

      if (action === "PICK" && actual > 0) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productVariantId_locationId: {
              productVariantId: pickListItem.productVariantId,
              locationId: pickListItem.locationId,
            },
          },
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantityReserved: {
                decrement: Math.min(actual, inventory.quantityReserved),
              },
              quantityOnHand: {
                decrement: Math.min(actual, inventory.quantityOnHand),
              },
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              productVariantId: pickListItem.productVariantId,
              locationId: pickListItem.locationId,
              transactionType: "SALE",
              quantityChange: -actual,
              referenceId: pickListItem.pickListId,
              referenceType: "PICK_LIST",
              userId: session.user.id,
              notes: `Picked for order ${pickListItem.order.orderNumber}`,
            },
          });
        } else {
          console.warn(
            `No inventory for variant ${pickListItem.productVariantId} at location ${pickListItem.locationId}`
          );
        }
      }

      const allItems = await tx.pickListItem.findMany({
        where: { pickListId: pickListItem.pickListId },
        select: { status: true },
      });

      const totalItems = allItems.length;
      const pickedCount = allItems.filter((i) =>
        ["PICKED", "SHORT_PICK", "SKIPPED"].includes(i.status)
      ).length;

      const allDone = pickedCount === totalItems && totalItems > 0;
      const wasPendingCount = allItems.filter(
        (i) => i.status === "PENDING"
      ).length;
      const isFirstAction =
        pickedCount === 1 && wasPendingCount === totalItems - 1;

      await tx.pickList.update({
        where: { id: pickListItem.pickListId },
        data: {
          pickedItems: pickedCount,
          totalItems, // keep in sync if you want
          status: allDone
            ? "COMPLETED"
            : isFirstAction
            ? "IN_PROGRESS"
            : undefined,
          startTime: isFirstAction ? new Date() : undefined,
          endTime: allDone ? new Date() : undefined,
        },
      });

      if (allDone) {
        await tx.pickEvent.create({
          data: {
            pickListId: pickListItem.pickListId,
            eventType: "PICK_COMPLETED",
            userId: session.user.id,
            notes: `Pick list ${pickListItem.pickListId} completed (${pickedCount}/${totalItems})`,
          },
        });

        // ✅ Update the order status to PICKED (or FULFILLED, PACKED, etc.)
        await tx.order.update({
          where: { id: pickListItem.orderId },
          data: { status: "PICKED" }, // or "FULFILLED", "PACKED", etc.
        });
      }

      await tx.pickEvent.create({
        data: {
          pickListId: pickListItem.pickListId,
          itemId: pickListItem.id,
          eventType:
            action === "PICK"
              ? "ITEM_PICKED"
              : action === "SHORT_PICK"
              ? "ITEM_SHORT_PICKED"
              : "ITEM_SKIPPED",
          userId: session.user.id,
          location: location || pickListItem.location?.name || null,
          notes: `${action}: ${pickListItem.productVariant.sku} (${actual}/${
            pickListItem.quantityToPick
          })${reason ? ` - ${reason}` : ""}`,
        },
      });

      return {
        item: updatedItem,
        progress: {
          pickedItems: pickedCount,
          totalItems,
          percentage: totalItems
            ? Math.round((pickedCount / totalItems) * 100)
            : 0,
          completed: allDone, // 👈 boolean flag
          status: allDone
            ? "COMPLETED"
            : isFirstAction
            ? "IN_PROGRESS"
            : pickListItem.pickList.status, // 👈 current list status
        },
      };
    });

    return NextResponse.json({
      success: true,
      action,
      item: {
        id: result.item.id,
        status: result.item.status,
        quantityPicked: result.item.quantityPicked,
        quantityToPick: result.item.quantityToPick,
        pickedAt: result.item.pickedAt,
      },
      progress: result.progress,
      message: `Item ${action.toLowerCase()} successfully`,
    });
  } catch (error: any) {
    console.error(
      "❌ Error processing pick item:",
      error?.message,
      error?.stack
    );
    return NextResponse.json(
      { error: error?.message ?? "Failed to process pick item" },
      { status: 500 }
    );
  }
}
