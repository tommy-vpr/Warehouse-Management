// app/api/packing/generate-packing-slip/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  generatePackingSlip,
  generatePackingSlipsForOrder,
} from "@/lib/packing-slip-generator";

import { prisma } from "@/lib/prisma";

/**
 * POST /api/packing/generate-packing-slip
 * Generate packing slip for specific package or all packages in an order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, packageId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // If packageId provided, generate for specific package
    if (packageId) {
      const pkg = await prisma.shippingPackage.findUnique({
        where: { id: packageId },
        include: {
          items: true,
          order: {
            include: {
              backOrders: {
                where: {
                  status: {
                    in: ["PENDING", "ALLOCATED"],
                  },
                },
              },
            },
          },
        },
      });

      if (!pkg) {
        return NextResponse.json(
          { error: "Package not found" },
          { status: 404 }
        );
      }

      // Get all packages for this order to determine total
      const allPackages = await prisma.shippingPackage.findMany({
        where: { orderId: pkg.orderId },
      });

      const packingSlipData = {
        orderId: pkg.order.id,
        orderNumber: pkg.order.orderNumber,
        customerName: pkg.order.customerName,
        customerEmail: pkg.order.customerEmail || undefined,
        shippingAddress: pkg.order.shippingAddress as any,
        items: pkg.items.map((item) => ({
          sku: item.sku,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
        })),
        packageNumber: pkg.packageNumber || 1,
        totalPackages: allPackages.length,
        trackingNumber: pkg.trackingNumber,
        carrierCode: pkg.carrierCode,
        serviceCode: pkg.serviceCode,
        subtotal: parseFloat(pkg.order.totalAmount.toString()),
        total: parseFloat(pkg.order.totalAmount.toString()),
        hasBackOrders: pkg.order.backOrders.length > 0,
        backOrderedItemsCount: pkg.order.backOrders.reduce(
          (sum, bo) => sum + bo.quantityBackOrdered,
          0
        ),
      };

      const url = await generatePackingSlip(packingSlipData);

      // Update package with packing slip URL
      await prisma.shippingPackage.update({
        where: { id: packageId },
        data: { packingSlipUrl: url },
      });

      return NextResponse.json({
        success: true,
        packingSlipUrl: url,
      });
    }

    // Generate for all packages in order
    const packingSlips = await generatePackingSlipsForOrder(orderId);

    return NextResponse.json({
      success: true,
      packingSlips,
    });
  } catch (error) {
    console.error("Error generating packing slip:", error);
    return NextResponse.json(
      {
        error: "Failed to generate packing slip",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/packing/generate-packing-slip?orderId=xxx
 * Get existing packing slips for an order
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const packages = await prisma.shippingPackage.findMany({
      where: { orderId },
      select: {
        id: true,
        trackingNumber: true,
        packingSlipUrl: true,
        packageNumber: true,
      },
    });

    return NextResponse.json({
      success: true,
      packages: packages.map((pkg) => ({
        packageId: pkg.id,
        trackingNumber: pkg.trackingNumber,
        packingSlipUrl: pkg.packingSlipUrl,
        packageNumber: pkg.packageNumber,
      })),
    });
  } catch (error) {
    console.error("Error fetching packing slips:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch packing slips",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
