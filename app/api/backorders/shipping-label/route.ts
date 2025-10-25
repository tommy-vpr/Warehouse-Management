// app/api/backorders/shipping-label/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createShipEngineLabel } from "@/lib/shipengine";
import { updateOrderStatus } from "@/lib/order-status-helper";

/**
 * Create shipping label for grouped back orders
 * Groups all PACKED back orders for an order into a single package
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, carrierCode, serviceCode, insuranceAmount } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    console.log(
      `📦 Creating shipping label for back orders on order ${orderId}`
    );

    // Get order with all PACKED back orders
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        backOrders: {
          where: {
            status: "PACKED",
            shippingPackageId: null, // Only back orders not yet in a package
          },
          include: {
            productVariant: {
              select: {
                id: true,
                sku: true,
                name: true,
                weight: true,
                length: true,
                width: true,
                height: true,
              },
            },
          },
        },
        packages: true,
        shippingAddress: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.backOrders.length === 0) {
      return NextResponse.json(
        {
          error: "No back orders ready to ship",
          message:
            "All back orders must be in PACKED status and not already assigned to a package",
        },
        { status: 400 }
      );
    }

    if (!order.shippingAddress) {
      return NextResponse.json(
        { error: "Order has no shipping address" },
        { status: 400 }
      );
    }

    console.log(
      `📋 Found ${order.backOrders.length} back orders ready to ship`
    );

    // Calculate package dimensions and weight
    const packageDimensions = calculatePackageDimensions(order.backOrders);
    const totalWeight = calculateTotalWeight(order.backOrders);

    console.log(`📏 Package dimensions:`, packageDimensions);
    console.log(`⚖️  Total weight: ${totalWeight} oz`);

    // Create shipping label and package in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create ShipEngine label first (outside transaction if preferred, but keeping it simple)
      const labelData = await createShipEngineLabel({
        order,
        carrierCode: carrierCode || "usps",
        serviceCode: serviceCode || "usps_priority_mail",
        weight: totalWeight,
        dimensions: packageDimensions,
        items: order.backOrders.map((bo) => ({
          sku: bo.productVariant.sku,
          name: bo.productVariant.name,
          quantity: bo.quantityBackOrdered,
        })),
      });

      console.log(`🏷️  Created shipping label: ${labelData.trackingNumber}`);

      // Create ShippingPackage record
      const shippingPackage = await tx.shippingPackage.create({
        data: {
          orderId,
          carrierCode: labelData.carrierCode,
          serviceCode: labelData.serviceCode,
          trackingNumber: labelData.trackingNumber,
          labelUrl: labelData.labelDownload?.pdf || labelData.labelUrl,
          packageCode: labelData.labelId,
          cost: labelData.shipmentCost?.amount || 0,
          currency: labelData.shipmentCost?.currency || "USD",
          weight: totalWeight,
          dimensions: packageDimensions,
        },
      });

      console.log(`📦 Created shipping package ${shippingPackage.id}`);

      // Create PackageItems for each back order
      for (const backOrder of order.backOrders) {
        await tx.packageItem.create({
          data: {
            packageId: shippingPackage.id,
            productName: backOrder.productVariant.name,
            sku: backOrder.productVariant.sku,
            quantity: backOrder.quantityBackOrdered,
            unitPrice: 0, // You might want to get this from the order line item
          },
        });
      }

      console.log(`📝 Created ${order.backOrders.length} package items`);

      // Link all back orders to this package and update status
      await tx.backOrder.updateMany({
        where: {
          id: { in: order.backOrders.map((bo) => bo.id) },
        },
        data: {
          shippingPackageId: shippingPackage.id,
          status: "FULFILLED",
          fulfilledAt: new Date(),
        },
      });

      // Update quantityFulfilled individually (Prisma limitation)
      for (const backOrder of order.backOrders) {
        await tx.backOrder.update({
          where: { id: backOrder.id },
          data: {
            quantityFulfilled: backOrder.quantityBackOrdered,
          },
        });
      }

      console.log(
        `✅ Updated ${order.backOrders.length} back orders to FULFILLED`
      );

      // Check if all back orders for this order are now fulfilled
      const remainingBackOrders = await tx.backOrder.count({
        where: {
          orderId,
          status: { not: "FULFILLED" },
        },
      });

      if (remainingBackOrders === 0) {
        console.log(
          `✅ All back orders fulfilled for order ${order.orderNumber}`
        );

        // Update order to remove back order flag
        await tx.order.update({
          where: { id: orderId },
          data: {
            hasBackOrders: false,
          },
        });

        // Check if all packages have labels (order is ready to ship)
        const allPackages = await tx.shippingPackage.findMany({
          where: { orderId },
        });

        if (allPackages.length > 0) {
          await updateOrderStatus({
            orderId,
            newStatus: "READY_TO_SHIP",
            userId: session.user.id,
            notes: "All packages have shipping labels - ready to ship",
            tx,
          });
        }
      } else {
        console.log(
          `⏳ Order ${order.orderNumber} still has ${remainingBackOrders} pending back orders`
        );
      }

      return {
        package: shippingPackage,
        label: labelData,
        backOrdersFulfilled: order.backOrders.length,
        remainingBackOrders,
      };
    });

    console.log(
      `✅ Successfully created shipping label for ${result.backOrdersFulfilled} back orders`
    );

    return NextResponse.json({
      success: true,
      message: `Shipping label created for ${result.backOrdersFulfilled} back order(s)`,
      data: {
        packageId: result.package.id,
        trackingNumber: result.label.trackingNumber,
        labelUrl: result.label.labelDownload?.pdf || result.label.labelUrl,
        carrierCode: result.label.carrierCode,
        serviceCode: result.label.serviceCode,
        cost: result.label.shipmentCost?.amount || 0,
        backOrdersFulfilled: result.backOrdersFulfilled,
        remainingBackOrders: result.remainingBackOrders,
      },
    });
  } catch (error) {
    console.error("❌ Error creating shipping label for back orders:", error);

    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create shipping label",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Get orders with back orders ready for shipping labels
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find orders with PACKED back orders that need shipping labels
    const ordersReadyForLabels = await prisma.order.findMany({
      where: {
        hasBackOrders: true,
        backOrders: {
          some: {
            status: "PACKED",
            shippingPackageId: null,
          },
        },
      },
      include: {
        backOrders: {
          where: {
            status: "PACKED",
            shippingPackageId: null,
          },
          include: {
            productVariant: {
              select: {
                sku: true,
                name: true,
                weight: true,
              },
            },
          },
        },
        packages: {
          select: {
            id: true,
            trackingNumber: true,
          },
        },
        shippingAddress: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate details for each order
    const ordersWithDetails = ordersReadyForLabels.map((order) => {
      const totalWeight = calculateTotalWeight(order.backOrders);
      const dimensions = calculatePackageDimensions(order.backOrders);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        backOrderCount: order.backOrders.length,
        totalItems: order.backOrders.reduce(
          (sum, bo) => sum + bo.quantityBackOrdered,
          0
        ),
        estimatedWeight: totalWeight,
        estimatedDimensions: dimensions,
        hasShippingAddress: !!order.shippingAddress,
        existingPackages: order.packages.length,
        backOrders: order.backOrders.map((bo) => ({
          id: bo.id,
          sku: bo.productVariant.sku,
          productName: bo.productVariant.name,
          quantity: bo.quantityBackOrdered,
          status: bo.status,
        })),
      };
    });

    return NextResponse.json({
      orders: ordersWithDetails,
      totalOrders: ordersWithDetails.length,
      totalBackOrders: ordersWithDetails.reduce(
        (sum, o) => sum + o.backOrderCount,
        0
      ),
    });
  } catch (error) {
    console.error("Error fetching orders ready for labels:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

/**
 * Calculate total weight from back orders
 */
function calculateTotalWeight(
  backOrders: Array<{
    quantityBackOrdered: number;
    productVariant: { weight: number | null };
  }>
): number {
  return backOrders.reduce((total, bo) => {
    const itemWeight = bo.productVariant.weight || 0;
    return total + itemWeight * bo.quantityBackOrdered;
  }, 0);
}

/**
 * Calculate package dimensions from back orders
 */
function calculatePackageDimensions(
  backOrders: Array<{
    quantityBackOrdered: number;
    productVariant: {
      length: number | null;
      width: number | null;
      height: number | null;
    };
  }>
): { length: number; width: number; height: number } {
  const DEFAULT_LENGTH = 12;
  const DEFAULT_WIDTH = 9;
  const DEFAULT_HEIGHT = 3;

  let maxLength = 0;
  let maxWidth = 0;
  let totalHeight = 0;

  for (const bo of backOrders) {
    const itemLength = bo.productVariant.length || DEFAULT_LENGTH;
    const itemWidth = bo.productVariant.width || DEFAULT_WIDTH;
    const itemHeight = bo.productVariant.height || DEFAULT_HEIGHT;

    maxLength = Math.max(maxLength, itemLength);
    maxWidth = Math.max(maxWidth, itemWidth);
    totalHeight += itemHeight * bo.quantityBackOrdered;
  }

  return {
    length: maxLength || DEFAULT_LENGTH,
    width: maxWidth || DEFAULT_WIDTH,
    height: Math.min(totalHeight + 2, 24),
  };
}
