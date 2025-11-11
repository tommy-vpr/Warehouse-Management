import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const pickList = await prisma.pickList.findUnique({
      where: { id },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                customerName: true,
                totalAmount: true,
              },
            },
            productVariant: {
              select: {
                sku: true,
                upc: true, // ✅ ADD: UPC for barcode scanning
                barcode: true, // ✅ ADD: Alternative barcode field
                name: true,
                costPrice: true,
                sellingPrice: true,
                product: true,
              },
            },
            location: {
              select: {
                name: true,
                zone: true,
                aisle: true,
                shelf: true,
              },
            },
            picker: {
              select: { name: true },
            },
          },
          orderBy: { pickSequence: "asc" },
        },
        events: {
          include: {
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!pickList) {
      return NextResponse.json(
        { error: "Pick list not found" },
        { status: 404 }
      );
    }

    // Calculate progress and stats
    const stats = {
      totalItems: pickList.totalItems,
      pickedItems: pickList.pickedItems,
      progress:
        pickList.totalItems > 0
          ? Math.round((pickList.pickedItems / pickList.totalItems) * 100)
          : 0,
      pendingItems: pickList.items.filter((item) => item.status === "PENDING")
        .length,
      shortPicks: pickList.items.filter((item) => item.status === "SHORT_PICK")
        .length,
      skippedItems: pickList.items.filter((item) => item.status === "SKIPPED")
        .length,

      // ✅ UPDATED: Smart time calculation
      estimatedTimeRemaining: calculateTimeRemaining(pickList),

      uniqueOrders: [
        ...new Set(pickList.items.map((item) => item.order.orderNumber)),
      ],
      uniqueLocations: [
        ...new Set(pickList.items.map((item) => item.location.name)),
      ],
      totalValue: pickList.items.reduce(
        (sum, item) =>
          sum +
          (Number(item.productVariant.sellingPrice) || 0) * item.quantityToPick,
        0
      ),
    };

    // Add helper function above or below the GET function
    function calculateTimeRemaining(pickList: any) {
      if (!pickList.startTime || pickList.pickedItems === 0) {
        return Math.ceil((pickList.totalItems - pickList.pickedItems) * 1.5);
      }

      const elapsedMs = Date.now() - new Date(pickList.startTime).getTime();
      const elapsedMinutes = elapsedMs / (1000 * 60);
      const actualRatePerItem = elapsedMinutes / pickList.pickedItems;
      const itemsRemaining = pickList.totalItems - pickList.pickedItems;

      return Math.ceil(itemsRemaining * actualRatePerItem);
    }
    return NextResponse.json({
      pickList: {
        id: pickList.id,
        batchNumber: pickList.batchNumber,
        status: pickList.status,
        assignedTo: pickList.assignedUser,
        priority: pickList.priority,
        startTime: pickList.startTime,
        endTime: pickList.endTime,
        notes: pickList.notes,
        createdAt: pickList.createdAt,
        updatedAt: pickList.updatedAt,
      },
      items: pickList.items.map((item) => ({
        id: item.id,
        sequence: item.pickSequence,
        status: item.status,
        order: item.order,
        product: {
          sku: item.productVariant.sku,
          upc: item.productVariant.upc, // ✅ ADD: UPC for scanning
          barcode: item.productVariant.barcode, // ✅ ADD: Alternative barcode
          name: item.productVariant.name,
          costPrice: item.productVariant.costPrice,
          sellingPrice: item.productVariant.sellingPrice,
        },
        location: item.location,
        quantityToPick: item.quantityToPick,
        quantityPicked: item.quantityPicked,
        pickedAt: item.pickedAt,
        pickedBy: item.picker?.name,
        shortPickReason: item.shortPickReason,
        notes: item.notes,
      })),
      events: pickList.events.map((event) => ({
        id: event.id,
        type: event.eventType,
        user: event.user.name,
        location: event.location,
        scannedCode: event.scannedCode,
        notes: event.notes,
        createdAt: event.createdAt,
      })),
      stats,
    });
  } catch (error) {
    console.error("Error fetching pick list details:", error);
    return NextResponse.json(
      { error: "Failed to fetch pick list details" },
      { status: 500 }
    );
  }
}
