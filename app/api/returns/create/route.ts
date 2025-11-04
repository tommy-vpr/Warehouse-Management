// app/api/returns/create/route.ts
// API route to create a new return (RMA) + AUTO-GENERATE RETURN LABEL

import { NextRequest, NextResponse } from "next/server";
import { returnService } from "@/lib/services/returnServices";
import { CreateReturnRequest } from "@/types/returns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body: CreateReturnRequest = await request.json();

    // Validate request
    if (
      !body.orderId ||
      !body.customerEmail ||
      !body.reason ||
      !body.items?.length
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (body.items.some((item) => item.quantityRequested <= 0)) {
      return NextResponse.json(
        { error: "Invalid quantity requested" },
        { status: 400 }
      );
    }

    // 1. Create the return using your existing service
    const result = await returnService.createReturn(body, session?.user?.id);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // 2. ✅ AUTO-GENERATE RETURN LABEL (1 label by default)
    console.log(
      `🏷️ Auto-generating return label for RMA ${result.returnOrder.rmaNumber}`
    );

    try {
      const labelResult = await generateReturnLabel(result.returnOrder.id);

      if (labelResult.success) {
        console.log(`✅ Return label created: ${labelResult.trackingNumber}`);

        // Include label info in response
        return NextResponse.json({
          ...result,
          returnLabel: {
            trackingNumber: labelResult.trackingNumber,
            labelUrl: labelResult.labelUrl,
            cost: labelResult.cost,
            carrier: "USPS",
          },
        });
      } else {
        // Label generation failed, but RMA was created successfully
        console.warn(
          `⚠️ Label generation failed for RMA ${result.returnOrder.rmaNumber}`
        );

        return NextResponse.json({
          ...result,
          warning:
            "Return created but label generation failed. Please contact support for a return label.",
        });
      }
    } catch (labelError) {
      console.error("Label generation error:", labelError);

      // Still return success for RMA, just note label failure
      return NextResponse.json({
        ...result,
        warning:
          "Return created but label generation failed. Please contact support for a return label.",
      });
    }
  } catch (error: any) {
    console.error("Error creating return:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create return" },
      { status: 500 }
    );
  }
}

// ===================================================================
// HELPER: Generate return label via ShipEngine
// ===================================================================
async function generateReturnLabel(returnOrderId: string) {
  try {
    // Get return order with original order details
    const returnOrder = await prisma.returnOrder.findUnique({
      where: { id: returnOrderId },
      include: {
        order: true,
      },
    });

    if (!returnOrder) {
      throw new Error("Return order not found");
    }

    // Warehouse address (destination - where return is going)
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

    // Customer address (origin - from original order)
    const order = returnOrder.order;
    const addr = order.shippingAddress as any;

    if (!addr) {
      throw new Error("Customer shipping address not found");
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

    // Create ShipEngine shipment
    const shipment = {
      carrier_code: "stamps_com",
      service_code: "usps_ground_advantage",
      ship_from: customerAddress, // FROM customer
      ship_to: warehouseAddress, // TO warehouse
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

    // Call ShipEngine API
    const response = await fetch("https://api.shipengine.com/v1/labels", {
      method: "POST",
      headers: {
        "API-Key": process.env.SHIPENGINE_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shipment,
        label_format: "pdf",
        label_layout: "letter", // 8.5x11 for easy home printing
        label_download_type: "url",
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `ShipEngine error: ${error?.message || response.statusText}`
      );
    }

    const label = await response.json();

    // Update return order with label info
    await prisma.returnOrder.update({
      where: { id: returnOrderId },
      data: {
        returnTrackingNumber: label.tracking_number,
        returnCarrier: "stamps_com",
        returnLabelUrl: label.label_download?.pdf || label.label_download?.href,
        returnShippingCost: new Prisma.Decimal(
          label.shipment_cost?.amount || 0
        ),
        packagesExpected: 1,
        labelCreatedAt: new Date(),
        status: "APPROVED", // Move from PENDING to APPROVED
      },
    });

    return {
      success: true,
      trackingNumber: label.tracking_number,
      labelUrl: label.label_download?.pdf || label.label_download?.href,
      cost: label.shipment_cost?.amount || 0,
    };
  } catch (error: any) {
    console.error("Failed to generate return label:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
