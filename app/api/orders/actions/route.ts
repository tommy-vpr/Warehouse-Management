import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { reserveOrderInventory } from "@/lib/reserveInventory";
import { fulfillOrderAndUpdateShopify } from "@/lib/fulfillOrderAndUpdateShopify";
import { generateBulkPickLists } from "@/lib/generateBulkPickLists";
import { generateSinglePickList } from "@/lib/generateSinglePickList";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, orderId, orderIds } = await request.json();

    switch (action) {
      case "ALLOCATE":
        await reserveOrderInventory({ orderId, userId: session.user.id });
        break;

      case "MARK_FULFILLED":
        await fulfillOrderAndUpdateShopify(orderId, session.user.id);
        break;

      case "GENERATE_SINGLE_PICK":
        try {
          const result = await generateSinglePickList({
            orderIds: [orderId],
            pickingStrategy: "SINGLE",
            userId: session.user.id,
          });

          // Automatically start the pick list using the same logic as your startPicking function
          const startResponse = await fetch(
            `${
              process.env.NEXTAUTH_URL || "http://localhost:3000"
            }/api/picking/lists/${result.id}/start`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Cookie: request.headers.get("Cookie") || "",
              },
            }
          );

          if (!startResponse.ok) {
            console.error(
              "Failed to auto-start pick list:",
              startResponse.status
            );
          }

          console.log(
            `Generated and started single pick list ${result.batchNumber} for order ${orderId}`
          );
        } catch (error) {
          console.error(
            "Failed to generate and start single pick list:",
            error
          );
          throw error;
        }
        break;

      case "BULK_GENERATE_PICKS":
        await generateBulkPickLists(orderIds);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${action} completed successfully`,
    });
  } catch (error) {
    console.error("Action error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 500 }
    );
  }
}
