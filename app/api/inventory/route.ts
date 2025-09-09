import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const location = searchParams.get("location");

    const inventory = await prisma.inventory.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  {
                    productVariant: {
                      sku: { contains: search, mode: "insensitive" },
                    },
                  },
                  {
                    productVariant: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  },
                  { productVariant: { upc: { contains: search } } },
                ],
              }
            : {},
          location ? { locationId: location } : {},
        ],
      },
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
        location: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Add calculated quantityAvailable field
    const inventoryWithAvailable = inventory.map((item) => ({
      ...item,
      quantityAvailable: Math.max(
        0,
        item.quantityOnHand - item.quantityReserved
      ),
    }));

    return NextResponse.json(inventoryWithAvailable);
  } catch (error) {
    console.error("Error fetching inventory:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch inventory";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productVariantId, locationId, quantityChange, type, notes } = body;

    // Validate required fields
    if (
      !productVariantId ||
      !locationId ||
      typeof quantityChange !== "number"
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: productVariantId, locationId, quantityChange",
        },
        { status: 400 }
      );
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create inventory transaction record
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productVariantId,
          locationId,
          transactionType: type || "ADJUSTMENT",
          quantityChange,
          userId: session.user.id,
          notes,
        },
      });

      // Update or create inventory record
      const inventory = await tx.inventory.upsert({
        where: {
          productVariantId_locationId: {
            productVariantId,
            locationId,
          },
        },
        update: {
          quantityOnHand: {
            increment: quantityChange,
          },
          updatedAt: new Date(),
        },
        create: {
          productVariantId,
          locationId,
          quantityOnHand: Math.max(0, quantityChange),
          quantityReserved: 0,
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

      // Add calculated quantityAvailable
      const inventoryWithAvailable = {
        ...inventory,
        quantityAvailable: Math.max(
          0,
          inventory.quantityOnHand - inventory.quantityReserved
        ),
      };

      return { transaction, inventory: inventoryWithAvailable };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating inventory:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to update inventory";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
