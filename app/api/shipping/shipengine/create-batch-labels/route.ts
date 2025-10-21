// File: app/api/shipping/create-batch-labels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { updateOrderStatus } from "@/lib/order-status-helper";
import {
  updateShopifyFulfillment,
  getShopifyCarrierName,
} from "@/lib/shopify-fulfillment";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, shippingAddress, shipments } = await request.json();
    if (!orderId || !Array.isArray(shipments) || shipments.length === 0) {
      return NextResponse.json(
        { error: "Invalid batch payload" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { productVariant: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const allLabels: any[] = [];
    const shippingPackages: any[] = [];

    for (const shipmentData of shipments) {
      const { carrierCode, serviceCode, packages, notes, items } = shipmentData;

      if (!carrierCode || !serviceCode || !packages || packages.length === 0) {
        return NextResponse.json(
          { error: "Each shipment requires carrier, service, and packages" },
          { status: 400 }
        );
      }

      const warehouseAddress = {
        name: process.env.WAREHOUSE_NAME || "WMS Warehouse",
        company_name: process.env.WAREHOUSE_COMPANY || "Your Company",
        address_line1: process.env.WAREHOUSE_ADDRESS1 || "123 Warehouse St",
        city_locality: process.env.WAREHOUSE_CITY || "Los Angeles",
        state_province: process.env.WAREHOUSE_STATE || "CA",
        postal_code: process.env.WAREHOUSE_ZIP || "90210",
        country_code: "US",
        phone: process.env.WAREHOUSE_PHONE || "555-123-4567",
      };

      const customerAddress = {
        name: shippingAddress?.name || order.customerName || "Customer",
        company_name: shippingAddress?.company || undefined,
        address_line1: shippingAddress?.address1,
        address_line2: shippingAddress?.address2 || undefined,
        city_locality: shippingAddress?.city,
        state_province:
          shippingAddress?.province || shippingAddress?.province_code,
        postal_code: shippingAddress?.postalCode || shippingAddress?.zip,
        country_code: shippingAddress?.countryCode || "US",
        phone: shippingAddress?.phone || "555-123-4567",
        address_residential_indicator: "yes" as const,
      };

      const labelResponse = await fetch(
        "https://api.shipengine.com/v1/labels",
        {
          method: "POST",
          headers: {
            "API-Key": process.env.SHIPENGINE_API_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shipment: {
              carrier_code: carrierCode,
              service_code: serviceCode,
              ship_from: warehouseAddress,
              ship_to: customerAddress,
              packages,
            },
            label_format: "pdf",
            label_layout: "4x6",
            label_download_type: "url",
          }),
        }
      );

      if (!labelResponse.ok) {
        const errorData = await labelResponse.json().catch(() => ({}));
        return NextResponse.json(
          {
            error: `Label creation failed: ${
              errorData?.message || "Unknown error"
            }`,
          },
          { status: 422 }
        );
      }

      const label = await labelResponse.json();
      allLabels.push({
        ...label,
        carrierCode,
        serviceCode,
        notes,
        items,
        packages,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const label of allLabels) {
        const packagesData = label.packages || [label];
        const numberOfPackages = packagesData.length;
        const totalCost = label.shipment_cost?.amount || 0;
        const costPerPackage =
          numberOfPackages > 0 ? totalCost / numberOfPackages : totalCost;

        for (let i = 0; i < packagesData.length; i++) {
          const pkg = packagesData[i];
          const original = label.packages[i] || {};

          const packageCreated = await tx.shippingPackage.create({
            data: {
              orderId,
              carrierCode: label.carrierCode,
              serviceCode: label.serviceCode,
              trackingNumber: pkg.tracking_number,
              labelUrl: pkg.label_download?.pdf || pkg.label_download?.href,
              cost: costPerPackage,
              currency: label.shipment_cost?.currency || "USD",
              packageCode: original?.packageCode || "package",
              weight: original?.weight || 1,
              dimensions: {
                length: original?.length || 10,
                width: original?.width || 8,
                height: original?.height || 6,
                unit: "inch",
              },
              items: {
                create: (label.items || []).map((item: any) => ({
                  productName: item.productName,
                  sku: item.sku,
                  quantity: item.quantity,
                  unitPrice: new Prisma.Decimal(item.unitPrice),
                })),
              },
            },
          });

          shippingPackages.push(packageCreated);
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          shippingStatus: "PARTIALLY_SHIPPED",
          shippedAt: new Date(),
          trackingNumber: allLabels.map((l) => l.tracking_number).join(", "),
        },
      });

      await updateOrderStatus({
        tx,
        userId: session.user.id,
        orderId,
        newStatus: "PARTIALLY_SHIPPED",
        notes: `Batch label created with ${shippingPackages.length} packages.`,
      });

      const itemsToFulfill = allLabels.flatMap((label) => label.items || []);

      if (order.shopifyOrderId) {
        try {
          const allItems = allLabels.flatMap((label) => label.items || []);

          const itemsToFulfill = allItems.map((item: any) => ({
            variantId: item.variantId,
            sku: item.sku,
            quantity: item.quantity,
          }));

          // ✅ NEW: Collect ALL tracking numbers from all packages
          const allTrackingNumbers = shippingPackages.map(
            (pkg) => pkg.trackingNumber
          );
          const allTrackingUrls = shippingPackages.map((pkg) => pkg.labelUrl);

          console.log(
            `📦 Sending ${allTrackingNumbers.length} tracking number(s) to Shopify`
          );

          await updateShopifyFulfillment({
            orderId: order.shopifyOrderId,
            trackingNumbers: allTrackingNumbers, // ✅ CHANGED: Send array
            trackingUrls: allTrackingUrls, // ✅ CHANGED: Send array
            trackingCompany: getShopifyCarrierName(
              allLabels[0]?.carrierCode || ""
            ),
            lineItems: itemsToFulfill,
            notifyCustomer: true,
            isBackOrder: false,
          });

          console.log("✅ Shopify fulfillment created");
        } catch (shopifyError) {
          console.error("⚠️ Shopify fulfillment failed:", shopifyError);

          await prisma.shopifySync.create({
            data: {
              orderId: order.id,
              syncType: "FULFILLMENT",
              status: "PENDING",
              attempts: 0,
              data: {
                trackingNumbers: shippingPackages.map((p) => p.trackingNumber), // ✅ All tracking
                trackingUrls: shippingPackages.map((p) => p.labelUrl),
                carrier: allLabels[0]?.carrierCode,
              },
              error:
                shopifyError instanceof Error
                  ? shopifyError.message
                  : "Unknown error",
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      orderId,
      shippingPackages,
      labels: allLabels.map((l) => ({
        trackingNumber: l.tracking_number,
        labelUrl: l.label_download?.pdf || l.label_download?.href,
        carrierCode: l.carrierCode,
        serviceCode: l.serviceCode,
      })),
    });
  } catch (err) {
    console.error("Batch label error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
