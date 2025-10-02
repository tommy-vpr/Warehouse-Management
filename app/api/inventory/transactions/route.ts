import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      productVariantId,
      locationId,
      toLocationId,
      transactionType,
      quantityChange,
      notes,
      referenceType,
      referenceId,
    } = await request.json();

    // Validate required fields
    if (!productVariantId || !transactionType || quantityChange === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate transfer requires both locations
    if (transactionType === "TRANSFER" && (!locationId || !toLocationId)) {
      return NextResponse.json(
        { error: "Transfer requires both source and destination locations" },
        { status: 400 }
      );
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Handle TRANSFER separately
      if (transactionType === "TRANSFER" && locationId && toLocationId) {
        // 1. Check source inventory
        const sourceInventory = await tx.inventory.findUnique({
          where: {
            productVariantId_locationId: {
              productVariantId,
              locationId,
            },
          },
        });

        if (!sourceInventory) {
          throw new Error("Source location has no inventory");
        }

        if (sourceInventory.quantityOnHand < quantityChange) {
          throw new Error(
            `Insufficient inventory at source location. Available: ${sourceInventory.quantityOnHand}, Requested: ${quantityChange}`
          );
        }

        // 2. Deduct from source location
        await tx.inventory.update({
          where: { id: sourceInventory.id },
          data: {
            quantityOnHand: sourceInventory.quantityOnHand - quantityChange,
            updatedAt: new Date(),
          },
        });

        // 3. Add to destination location
        const destInventory = await tx.inventory.findUnique({
          where: {
            productVariantId_locationId: {
              productVariantId,
              locationId: toLocationId,
            },
          },
        });

        if (destInventory) {
          await tx.inventory.update({
            where: { id: destInventory.id },
            data: {
              quantityOnHand: destInventory.quantityOnHand + quantityChange,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              productVariantId,
              locationId: toLocationId,
              quantityOnHand: quantityChange,
              quantityReserved: 0,
            },
          });
        }

        // 4. Get location names for better notes
        const [fromLoc, toLoc] = await Promise.all([
          tx.location.findUnique({
            where: { id: locationId },
            select: { name: true },
          }),
          tx.location.findUnique({
            where: { id: toLocationId },
            select: { name: true },
          }),
        ]);

        // 5. Create transaction record
        const transaction = await tx.inventoryTransaction.create({
          data: {
            productVariantId,
            locationId, // From location
            transactionType: "TRANSFER",
            quantityChange: -quantityChange, // Negative for source
            userId: session.user.id,
            notes: `Transferred ${quantityChange} units from ${
              fromLoc?.name
            } to ${toLoc?.name}${notes ? `: ${notes}` : ""}`,
            referenceType: referenceType || "MANUAL_TRANSFER",
            referenceId: toLocationId, // Store destination in referenceId
          },
          include: {
            user: {
              select: { name: true },
            },
          },
        });

        return transaction;
      }

      // Handle ADJUSTMENT and COUNT (existing logic)
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productVariantId,
          locationId,
          transactionType,
          quantityChange,
          userId: session.user.id,
          notes,
          referenceType,
          referenceId,
        },
        include: {
          user: {
            select: { name: true },
          },
        },
      });

      // Update inventory quantities if locationId is provided
      if (locationId) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productVariantId_locationId: {
              productVariantId,
              locationId,
            },
          },
        });

        if (inventory) {
          const newQuantity = Math.max(
            0,
            inventory.quantityOnHand + quantityChange
          );
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantityOnHand: newQuantity,
              updatedAt: new Date(),
            },
          });
        } else if (quantityChange > 0) {
          // Create new inventory record if it doesn't exist and we're adding stock
          await tx.inventory.create({
            data: {
              productVariantId,
              locationId,
              quantityOnHand: quantityChange,
              quantityReserved: 0,
            },
          });
        }
      } else {
        // If no specific location, update all locations proportionally
        const inventoryItems = await tx.inventory.findMany({
          where: { productVariantId },
        });

        if (inventoryItems.length > 0) {
          const totalQuantity = inventoryItems.reduce(
            (sum, item) => sum + item.quantityOnHand,
            0
          );

          for (const item of inventoryItems) {
            if (totalQuantity > 0) {
              const proportion = item.quantityOnHand / totalQuantity;
              const adjustment = Math.round(quantityChange * proportion);
              const newQuantity = Math.max(0, item.quantityOnHand + adjustment);

              await tx.inventory.update({
                where: { id: item.id },
                data: {
                  quantityOnHand: newQuantity,
                  updatedAt: new Date(),
                },
              });
            }
          }
        }
      }

      return transaction;
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: result.id,
        type: result.transactionType,
        quantityChange: result.quantityChange,
        userName: result.user?.name,
        createdAt: result.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating inventory transaction:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Duplicate transaction" },
          { status: 409 }
        );
      }
    }

    // Return the actual error message for validation errors
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productVariantId = searchParams.get("product");
    const locationId = searchParams.get("location");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};

    if (productVariantId) {
      where.productVariantId = productVariantId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (type) {
      where.transactionType = type;
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: {
        productVariant: {
          select: {
            sku: true,
            name: true,
          },
        },
        location: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.inventoryTransaction.count({ where });

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        productVariantId: t.productVariantId,
        productSku: t.productVariant.sku,
        productName: t.productVariant.name,
        locationId: t.locationId,
        locationName: t.location?.name,
        transactionType: t.transactionType,
        quantityChange: t.quantityChange,
        userId: t.userId,
        userName: t.user?.name,
        notes: t.notes,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        createdAt: t.createdAt.toISOString(),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching inventory transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
