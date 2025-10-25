// app/api/backorders/bulk-shipping-labels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createShipEngineLabel } from "@/lib/shipengine";
import { updateOrderStatus } from "@/lib/order-status-helper";

/**
 * Create shipping labels for multiple orders with back orders
 * Processes each order's back orders as a single package
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      orderIds,
      carrierCode = "usps",
      serviceCode = "usps_priority_mail",
      insuranceAmount = 0,
    } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "orderIds array is required" },
        { status: 400 }
      );
    }

    console.log(
      `📦 Processing bulk shipping labels for ${orderIds.length} orders`
    );

    // Get all orders with their back orders
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        hasBackOrders: true,
        backOrders: {
          some: {
            status: "PACKED",
            packageId: null,
          },
        },
      },
      include: {
        backOrders: {
          where: {
            status: "PACKED",
            packageId: null,
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
        packages: {
          orderBy: {
            packageNumber: "desc",
          },
          take: 1,
        },
        shippingAddress: true,
      },
    });

    if (orders.length === 0) {
      return NextResponse.json(
        {
          error: "No orders found with back orders ready to ship",
          message:
            "Orders must have PACKED back orders that are not yet assigned to packages",
        },
        { status: 400 }
      );
    }

    console.log(`📋 Found ${orders.length} orders ready to process`);

    const results: Array<{
      orderId: string;
      orderNumber: string;
      success: boolean;
      packageId?: string;
      trackingNumber?: string;
      error?: string;
    }> = [];

    const errors: Array<{ orderId: string; error: string }> = [];

    // Process each order
    for (const order of orders) {
      try {
        console.log(`\n📦 Processing order ${order.orderNumber}...`);

        if (!order.shippingAddress) {
          errors.push({
            orderId: order.id,
            error: "No shipping address",
          });
          results.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            success: false,
            error: "No shipping address",
          });
          continue;
        }

        if (order.backOrders.length === 0) {
          errors.push({
            orderId: order.id,
            error: "No back orders ready to ship",
          });
          results.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            success: false,
            error: "No back orders ready to ship",
          });
          continue;
        }

        // Calculate package dimensions and weight
        const totalWeight = order.backOrders.reduce((sum, bo) => {
          const itemWeight = bo.productVariant.weight || 0;
          return sum + itemWeight * bo.quantityBackOrdered;
        }, 0);

        const packageDimensions = calculatePackageDimensions(order.backOrders);

        console.log(
          `  📋 ${order.backOrders.length} back orders, ${totalWeight}oz, ${packageDimensions.length}x${packageDimensions.width}x${packageDimensions.height}`
        );

        // Create shipping label in transaction
        const result = await prisma.$transaction(async (tx) => {
          // Get next package number
          const nextPackageNumber =
            order.packages.length > 0 ? order.packages[0].packageNumber + 1 : 1;

          // Create package
          const backOrderPackage = await tx.package.create({
            data: {
              orderId: order.id,
              packageNumber: nextPackageNumber,
              weight: totalWeight,
              length: packageDimensions.length,
              width: packageDimensions.width,
              height: packageDimensions.height,
              insuranceAmount,
            },
          });

          // Create package items
          for (const backOrder of order.backOrders) {
            await tx.packageItem.create({
              data: {
                packageId: backOrderPackage.id,
                productVariantId: backOrder.productVariantId,
                quantity: backOrder.quantityBackOrdered,
              },
            });
          }

          // Create ShipEngine label
          const labelData = await createShipEngineLabel({
            order: {
              ...order,
              packages: [backOrderPackage],
            },
            packageId: backOrderPackage.id,
            carrierCode,
            serviceCode,
            items: order.backOrders.map((bo) => ({
              sku: bo.productVariant.sku,
              name: bo.productVariant.name,
              quantity: bo.quantityBackOrdered,
            })),
          });

          // Update package with label info
          await tx.package.update({
            where: { id: backOrderPackage.id },
            data: {
              trackingNumber: labelData.trackingNumber,
              shippingLabelUrl: labelData.labelDownload.pdf,
              shippingLabelId: labelData.labelId,
              carrierCode: labelData.carrierCode,
              serviceCode: labelData.serviceCode,
              shipmentCost: labelData.shipmentCost.amount,
            },
          });

          // Create audit trail
          await tx.shippingAudit.create({
            data: {
              packageId: backOrderPackage.id,
              action: "LABEL_CREATED",
              performedById: session.user.id,
              details: {
                trackingNumber: labelData.trackingNumber,
                carrierCode: labelData.carrierCode,
                serviceCode: labelData.serviceCode,
                cost: labelData.shipmentCost.amount,
                backOrderIds: order.backOrders.map((bo) => bo.id),
                backOrderCount: order.backOrders.length,
                bulkProcess: true,
              },
            },
          });

          // Update back orders
          await tx.backOrder.updateMany({
            where: {
              id: { in: order.backOrders.map((bo) => bo.id) },
            },
            data: {
              packageId: backOrderPackage.id,
              status: "FULFILLED",
              fulfilledAt: new Date(),
            },
          });

          // Update quantityFulfilled individually
          for (const backOrder of order.backOrders) {
            await tx.backOrder.update({
              where: { id: backOrder.id },
              data: {
                quantityFulfilled: backOrder.quantityBackOrdered,
              },
            });
          }

          // Check if all back orders fulfilled
          const remainingBackOrders = await tx.backOrder.count({
            where: {
              orderId: order.id,
              status: { not: "FULFILLED" },
            },
          });

          if (remainingBackOrders === 0) {
            await tx.order.update({
              where: { id: order.id },
              data: {
                hasBackOrders: false,
              },
            });

            // Check if all packages have labels
            const allPackages = await tx.package.findMany({
              where: { orderId: order.id },
            });

            const allHaveLabels = allPackages.every((p) => p.shippingLabelId);

            if (allHaveLabels) {
              await updateOrderStatus({
                orderId: order.id,
                newStatus: "READY_TO_SHIP",
                userId: session.user.id,
                notes: "All packages have shipping labels - ready to ship",
                tx,
              });
            }
          }

          return {
            package: backOrderPackage,
            label: labelData,
          };
        });

        console.log(`  ✅ Created label: ${result.label.trackingNumber}`);

        results.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          success: true,
          packageId: result.package.id,
          trackingNumber: result.label.trackingNumber,
        });
      } catch (error) {
        console.error(
          `  ❌ Error processing order ${order.orderNumber}:`,
          error
        );

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        errors.push({
          orderId: order.id,
          error: errorMessage,
        });

        results.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `\n✅ Bulk processing complete: ${successCount} succeeded, ${failureCount} failed`
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} orders: ${successCount} succeeded, ${failureCount} failed`,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: failureCount,
      },
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ Error in bulk shipping label creation:", error);

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
            : "Failed to create bulk shipping labels",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
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
    height: Math.min(totalHeight + 2, 24), // Cap at 24 inches with padding
  };
}
