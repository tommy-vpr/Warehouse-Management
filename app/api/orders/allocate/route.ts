// app/api/orders/allocate/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { reserveOrderInventory } from "@/lib/reserveInventory";
import { updateOrderStatus } from "@/lib/order-status-helper";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, action, notes } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    // action can be: 'check' (default), 'backorder', or 'count'
    const allocationStrategy = action || "check";

    // Strategy mapping:
    // - 'check': Just check for insufficient inventory, don't allocate if there are issues
    // - 'backorder': Allocate what's available, create back orders for the rest
    // - 'count': Create cycle count tasks for locations with insufficient stock

    const handleInsufficientInventory =
      allocationStrategy === "backorder"
        ? "backorder"
        : allocationStrategy === "count"
        ? "count"
        : "throw";

    // Attempt allocation
    const allocationResult = await reserveOrderInventory({
      orderId,
      userId: session.user.id,
      handleInsufficientInventory,
      notes,
    });

    // If allocation failed due to insufficient inventory
    if (!allocationResult.success && allocationResult.insufficientItems) {
      return NextResponse.json(
        {
          success: false,
          error: "INSUFFICIENT_INVENTORY",
          insufficientItems: allocationResult.insufficientItems,
          message: `Cannot allocate inventory. ${allocationResult.insufficientItems.length} item(s) have insufficient stock.`,
        },
        { status: 400 }
      );
    }

    // If allocation succeeded
    const statusNotes = allocationResult.insufficientItems
      ? `Partial allocation - ${allocationResult.reservations.length} location(s) allocated, ${allocationResult.insufficientItems.length} back order(s) created`
      : `Inventory allocated successfully - ${allocationResult.reservations.length} location(s)`;

    await updateOrderStatus({
      orderId,
      newStatus: "ALLOCATED",
      userId: session.user.id,
      notes: statusNotes,
    });

    return NextResponse.json({
      success: true,
      message: "Allocation completed successfully",
      reservations: allocationResult.reservations,
      hasBackOrders: !!allocationResult.insufficientItems,
      backOrderCount: allocationResult.insufficientItems?.length || 0,
    });
  } catch (error) {
    console.error("Allocation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Allocation failed" },
      { status: 500 }
    );
  }
}
