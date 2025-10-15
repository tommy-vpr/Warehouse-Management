// app/api/picking/lists/[id]/complete/route.ts
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

    // Update pick list and related orders
    const result = await prisma.$transaction(async (tx) => {
      // Get the pick list with all items
      const pickList = await tx.pickList.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              order: true,
            },
          },
        },
      });

      if (!pickList) {
        throw new Error("Pick list not found");
      }

      if (pickList.status === "COMPLETED") {
        throw new Error("Pick list is already completed");
      }

      // Calculate total picked items
      const totalPicked = pickList.items.reduce(
        (sum, item) => sum + (item.quantityPicked || 0),
        0
      );

      // Complete the pick list
      const updatedPickList = await tx.pickList.update({
        where: { id },
        data: {
          status: "COMPLETED",
          endTime: new Date(),
          pickedItems: totalPicked,
        },
      });

      // Get unique order IDs
      const orderIds = [...new Set(pickList.items.map((item) => item.orderId))];

      // Update each order status with history
      for (const orderId of orderIds) {
        // ✅ UPDATE: Update back orders to PICKED status
        await tx.backOrder.updateMany({
          where: {
            orderId: orderId,
            status: "PICKING",
          },
          data: {
            status: "PICKED",
          },
        });

        // Update order status to PICKED with history
        await updateOrderStatus({
          orderId,
          newStatus: "PICKED",
          userId: session.user.id,
          notes: `Pick list ${pickList.batchNumber} completed`,
          tx,
        });
      }

      // Log completion event
      await tx.pickEvent.create({
        data: {
          pickListId: id,
          eventType: "PICK_COMPLETED",
          userId: session.user.id,
          notes: `Pick list completed - ${totalPicked} items picked from ${orderIds.length} order(s)`,
        },
      });

      return updatedPickList;
    });

    return NextResponse.json({
      success: true,
      message: "Pick list completed successfully",
      pickList: {
        id: result.id,
        batchNumber: result.batchNumber,
        status: result.status,
        pickedItems: result.pickedItems,
        endTime: result.endTime,
      },
    });
  } catch (error) {
    console.error("Error completing pick list:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to complete pick list",
      },
      { status: 500 }
    );
  }
}
