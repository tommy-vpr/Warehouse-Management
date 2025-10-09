import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyUser } from "@/lib/ably-server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      productVariantId,
      transactionType,
      quantityChange,
      locationId,
      toLocationId,
      notes,
      referenceType,
      confirmerId,
    } = await request.json();

    // ⭐ For TRANSFER, confirmer is MANDATORY
    if (transactionType === "TRANSFER") {
      if (!confirmerId) {
        return NextResponse.json(
          { error: "Confirmer is required for transfers" },
          { status: 400 }
        );
      }

      if (!locationId || !toLocationId) {
        return NextResponse.json(
          { error: "Both from and to locations are required for transfers" },
          { status: 400 }
        );
      }

      // Validate quantity available at source location
      const sourceInventory = await prisma.inventory.findUnique({
        where: {
          productVariantId_locationId: {
            productVariantId,
            locationId,
          },
        },
      });

      if (
        !sourceInventory ||
        sourceInventory.quantityOnHand < Math.abs(quantityChange)
      ) {
        return NextResponse.json(
          { error: "Insufficient quantity at source location" },
          { status: 400 }
        );
      }

      // Create pending transfer request
      const pendingTransfer = await prisma.$transaction(async (tx) => {
        // Get product and location details
        const product = await tx.productVariant.findUnique({
          where: { id: productVariantId },
          include: { product: true },
        });

        const fromLocation = await tx.location.findUnique({
          where: { id: locationId },
        });

        const toLocation = await tx.location.findUnique({
          where: { id: toLocationId },
        });

        const requestingUser = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { name: true },
        });

        // Create the transfer request (not yet applied to inventory)
        const transferRequest = await tx.inventoryTransaction.create({
          data: {
            productVariantId,
            transactionType: "TRANSFER",
            quantityChange: 0, // Not applied yet
            locationId,
            referenceType: "TRANSFER_PENDING",
            userId: session.user.id,
            notes: `PENDING CONFIRMATION: ${notes || "Transfer request"}`,
            metadata: {
              status: "PENDING",
              fromLocationId: locationId,
              fromLocationName: fromLocation?.name,
              toLocationId,
              toLocationName: toLocation?.name,
              quantity: quantityChange,
              requestedBy: session.user.id,
              requestedByName: requestingUser?.name,
              confirmerId,
              productName: product?.product.name,
            },
          },
        });

        // Notify the confirmer via Ably
        await notifyUser(confirmerId, {
          type: "TRANSFER_CONFIRMATION",
          title: "Transfer Confirmation Required",
          message: `${
            requestingUser?.name || "Someone"
          } requests transfer of ${quantityChange} ${
            product?.product.name
          } from ${fromLocation?.name} to ${toLocation?.name}`,
          // link: `/dashboard/inventory/transfers/pending/${transferRequest.id}`,
          link: `/dashboard/inventory/transfers/${transferRequest.id}`,
          timestamp: new Date().toISOString(),
        });

        // Create database notification
        await tx.notification.create({
          data: {
            userId: confirmerId,
            type: "TRANSFER_CONFIRMATION",
            title: "Transfer Confirmation Required",
            message: `${
              requestingUser?.name || "Someone"
            } requests transfer of ${quantityChange} ${product?.product.name}`,
            // link: `/dashboard/inventory/transfers/pending/${transferRequest.id}`,
            link: `/dashboard/inventory/transfers/${transferRequest.id}`,
            metadata: {
              transferId: transferRequest.id,
              fromLocation: fromLocation?.name,
              toLocation: toLocation?.name,
              quantity: quantityChange,
              productName: product?.product.name,
              requestedBy: session.user.id,
            },
          },
        });

        return transferRequest;
      });

      return NextResponse.json({
        success: true,
        message: "Transfer request sent for confirmation",
        transferId: pendingTransfer.id,
      });
    }

    // ⭐ Regular transactions (ADJUSTMENT, RECEIPT, SALE, etc.)
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productVariantId,
          transactionType,
          quantityChange,
          locationId: locationId || null,
          referenceType: referenceType || "MANUAL",
          userId: session.user.id,
          notes,
        },
      });

      // Update inventory for adjustments
      if (transactionType === "ADJUSTMENT") {
        if (locationId) {
          // Update specific location
          await tx.inventory.update({
            where: {
              productVariantId_locationId: {
                productVariantId,
                locationId,
              },
            },
            data: {
              quantityOnHand: { increment: quantityChange },
            },
          });
        } else {
          // Update first available location
          const firstInventory = await tx.inventory.findFirst({
            where: { productVariantId },
          });

          if (firstInventory) {
            await tx.inventory.update({
              where: { id: firstInventory.id },
              data: {
                quantityOnHand: { increment: quantityChange },
              },
            });
          }
        }
      }

      return transaction;
    });

    return NextResponse.json({
      success: true,
      transaction: result,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
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
