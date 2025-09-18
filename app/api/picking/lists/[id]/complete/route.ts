import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Update pick list and related orders
    const result = await prisma.$transaction(async (tx) => {
      // Complete the pick list
      const pickList = await tx.pickList.update({
        where: { id },
        data: {
          status: "COMPLETED",
          endTime: new Date(),
          pickedItems: {
            increment: 0, // This will be calculated
          },
        },
        include: {
          items: {
            include: {
              order: true,
            },
          },
        },
      });

      // Update related orders to PICKED status
      const orderIds = [...new Set(pickList.items.map((item) => item.orderId))];
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { status: "PICKED" },
      });

      // Log completion event
      await tx.pickEvent.create({
        data: {
          pickListId: id,
          eventType: "PICK_COMPLETED",
          userId: session.user.id,
          notes: `Pick list completed with ${pickList.items.length} items`,
        },
      });

      return pickList;
    });

    return NextResponse.json({
      success: true,
      message: "Pick list completed successfully",
      pickList: {
        id: result.id,
        batchNumber: result.batchNumber,
        status: result.status,
        endTime: result.endTime,
      },
    });
  } catch (error) {
    console.error("Error completing pick list:", error);
    return NextResponse.json(
      { error: "Failed to complete pick list" },
      { status: 500 }
    );
  }
}
