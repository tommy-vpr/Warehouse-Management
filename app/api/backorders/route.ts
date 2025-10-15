// app/api/backorders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Get all back orders with inventory availability
    const backOrders = await prisma.backOrder.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            pickListItems: {
              where: {
                pickList: {
                  status: {
                    in: ["PENDING", "ASSIGNED", "IN_PROGRESS"],
                  },
                },
              },
              select: {
                pickListId: true,
                pickList: {
                  select: {
                    id: true,
                    batchNumber: true,
                    status: true,
                    startTime: true,
                    createdAt: true,
                  },
                },
              },
              orderBy: {
                pickList: {
                  createdAt: "desc", // ✅ Order by nested pickList's createdAt
                },
              },
              take: 1,
            },
          },
        },
        productVariant: {
          select: {
            sku: true,
            name: true,
            inventory: {
              select: {
                quantityOnHand: true,
                quantityReserved: true,
                locationId: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate availability for each back order
    const backOrdersWithAvailability = backOrders.map((bo) => {
      const totalAvailable = bo.productVariant.inventory.reduce(
        (sum, inv) => sum + (inv.quantityOnHand - inv.quantityReserved),
        0
      );

      const remainingNeeded = bo.quantityBackOrdered - bo.quantityFulfilled;
      const canFulfill = totalAvailable >= remainingNeeded;

      const pickListId = bo.order.pickListItems[0]?.pickListId || null;
      const pickListBatchNumber =
        bo.order.pickListItems[0]?.pickList?.batchNumber || null;
      const pickListStatus =
        bo.order.pickListItems[0]?.pickList?.status || null;

      return {
        id: bo.id,
        orderId: bo.orderId,
        orderNumber: bo.order.orderNumber,
        customerName: bo.order.customerName,
        productVariantId: bo.productVariantId,
        sku: bo.productVariant.sku,
        productName: bo.productVariant.name,
        quantityBackOrdered: bo.quantityBackOrdered,
        quantityFulfilled: bo.quantityFulfilled,
        status: bo.status,
        reason: bo.reason,
        reasonDetails: bo.reasonDetails,
        createdAt: bo.createdAt,
        fulfilledAt: bo.fulfilledAt,
        availableInventory: totalAvailable,
        canFulfill,
        pickListId,
        pickListBatchNumber,
        pickListStatus,
      };
    });

    // Calculate stats
    const stats = {
      pending: backOrdersWithAvailability.filter(
        (bo) => bo.status === "PENDING"
      ).length,
      allocated: backOrdersWithAvailability.filter(
        (bo) => bo.status === "ALLOCATED"
      ).length,
      picking: backOrdersWithAvailability.filter(
        (bo) => bo.status === "PICKING"
      ).length,
      picked: backOrdersWithAvailability.filter((bo) => bo.status === "PICKED")
        .length,
      packed: backOrdersWithAvailability.filter((bo) => bo.status === "PACKED")
        .length,
      fulfilled: backOrdersWithAvailability.filter(
        (bo) => bo.status === "FULFILLED"
      ).length,
      canFulfillNow: backOrdersWithAvailability.filter(
        (bo) => bo.status === "PENDING" && bo.canFulfill
      ).length,
    };

    return NextResponse.json({
      backOrders: backOrdersWithAvailability,
      stats,
    });
  } catch (error) {
    console.error("Error fetching back orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch back orders" },
      { status: 500 }
    );
  }
}
