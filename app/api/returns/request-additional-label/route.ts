// app/api/returns/request-additional-label/route.ts
// API endpoint for customers to request an additional return label

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { returnOrderId } = await request.json();

    if (!returnOrderId) {
      return NextResponse.json(
        { error: "Return order ID is required" },
        { status: 400 }
      );
    }

    // Get return order with original order details
    const returnOrder = await prisma.returnOrder.findUnique({
      where: { id: returnOrderId },
      include: {
        order: true,
      },
    });

    if (!returnOrder) {
      return NextResponse.json(
        { error: "Return order not found" },
        { status: 404 }
      );
    }

    // Check if return is in a valid status
    if (!["APPROVED", "PENDING"].includes(returnOrder.status)) {
      return NextResponse.json(
        { error: "Return must be approved to generate additional labels" },
        { status: 400 }
      );
    }

    console.log(
      `🏷️ Generating additional return label for RMA ${returnOrder.rmaNumber}`
    );

    // ===================================================================
    // WAREHOUSE ADDRESS (destination)
    // ===================================================================
    const warehouseAddress = {
      name: process.env.WAREHOUSE_NAME || "Returns Department",
      company_name: process.env.WAREHOUSE_COMPANY || "Your Company",
      address_line1: process.env.WAREHOUSE_ADDRESS1 || "123 Warehouse St",
      city_locality: process.env.WAREHOUSE_CITY || "Los Angeles",
      state_province: process.env.WAREHOUSE_STATE || "CA",
      postal_code: process.env.WAREHOUSE_ZIP || "90210",
      country_code: "US",
      phone: process.env.WAREHOUSE_PHONE || "555-123-4567",
    };

    // ===================================================================
    // CUSTOMER ADDRESS (origin)
    // ===================================================================
    const order = returnOrder.order;
    const addr = order.shippingAddress as any;

    if (!addr) {
      return NextResponse.json(
        { error: "Customer shipping address not found" },
        { status: 400 }
      );
    }

    const customerAddress = {
      name: order.customerName || "Customer",
      address_line1: addr.address1 || addr.addressLine1,
      address_line2: addr.address2 || addr.addressLine2 || undefined,
      city_locality: addr.city,
      state_province: addr.province_code || addr.province || addr.stateProvince,
      postal_code: addr.zip || addr.postalCode,
      country_code: addr.country_code || addr.countryCode || "US",
      phone: addr.phone || "555-123-4567",
      address_residential_indicator: "yes" as const,
    };

    // ===================================================================
    // CREATE ADDITIONAL RETURN LABEL
    // ===================================================================
    const shipment = {
      carrier_code: "stamps_com",
      service_code: "usps_ground_advantage",
      ship_from: customerAddress,
      ship_to: warehouseAddress,
      packages: [
        {
          package_code: "package",
          weight: { value: 2, unit: "pound" as const },
          dimensions: {
            length: 12,
            width: 10,
            height: 8,
            unit: "inch" as const,
          },
        },
      ],
      advanced_options: {
        custom_field1: returnOrder.rmaNumber,
      },
    };

    const response = await fetch("https://api.shipengine.com/v1/labels", {
      method: "POST",
      headers: {
        "API-Key": process.env.SHIPENGINE_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shipment,
        label_format: "pdf",
        label_layout: "letter",
        label_download_type: "url",
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("ShipEngine error:", error);
      return NextResponse.json(
        {
          error: `Failed to create label: ${
            error?.message || response.statusText
          }`,
        },
        { status: 500 }
      );
    }

    const label = await response.json();

    console.log(`✅ Additional return label created: ${label.tracking_number}`);

    // ===================================================================
    // UPDATE RETURN ORDER (append tracking number)
    // ===================================================================
    const currentTracking = returnOrder.returnTrackingNumber || "";
    const currentLabelUrl = returnOrder.returnLabelUrl || "";
    const currentCost = returnOrder.returnShippingCost
      ? parseFloat(returnOrder.returnShippingCost.toString())
      : 0;

    const newTracking = currentTracking
      ? `${currentTracking}, ${label.tracking_number}`
      : label.tracking_number;

    const newLabelUrl = currentLabelUrl
      ? `${currentLabelUrl}, ${
          label.label_download?.pdf || label.label_download?.href
        }`
      : label.label_download?.pdf || label.label_download?.href;

    const newCost = currentCost + (label.shipment_cost?.amount || 0);

    await prisma.returnOrder.update({
      where: { id: returnOrderId },
      data: {
        returnTrackingNumber: newTracking,
        returnLabelUrl: newLabelUrl,
        returnShippingCost: new Prisma.Decimal(newCost),
        packagesExpected: (returnOrder.packagesExpected || 1) + 1, // Increment package count
      },
    });

    console.log(`✅ Return order updated with additional label`);

    // ===================================================================
    // RESPONSE
    // ===================================================================
    return NextResponse.json({
      success: true,
      trackingNumber: label.tracking_number,
      labelUrl: label.label_download?.pdf || label.label_download?.href,
      cost: label.shipment_cost?.amount || 0,
      totalPackages: (returnOrder.packagesExpected || 1) + 1,
      message: "Additional return label created successfully",
    });
  } catch (error: any) {
    console.error("Error creating additional return label:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create additional label" },
      { status: 500 }
    );
  }
}
