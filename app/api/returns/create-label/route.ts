// app/api/returns/create-label/route.ts
// Creates return shipping labels using EXISTING ReturnOrder schema
// (No ReturnPackage model - uses comma-separated tracking like outbound orders)

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
      returnOrderId,
      packageCount = 1, // How many packages customer needs
    } = await request.json();

    // Validate inputs
    if (!returnOrderId) {
      return NextResponse.json(
        { error: "Return order ID is required" },
        { status: 400 }
      );
    }

    if (packageCount < 1 || packageCount > 5) {
      return NextResponse.json(
        { error: "Package count must be between 1 and 5" },
        { status: 400 }
      );
    }

    console.log(
      `Creating ${packageCount} return label(s) for return: ${returnOrderId}`
    );

    // Get return order with original order details
    const returnOrder = await prisma.returnOrder.findUnique({
      where: { id: returnOrderId },
      include: {
        order: true,
        items: {
          include: {
            productVariant: true,
          },
        },
      },
    });

    if (!returnOrder) {
      return NextResponse.json(
        { error: "Return order not found" },
        { status: 404 }
      );
    }

    // Verify return is in correct status
    if (!["PENDING", "APPROVED"].includes(returnOrder.status)) {
      return NextResponse.json(
        { error: "Return must be pending to create labels" },
        { status: 400 }
      );
    }

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
    // CUSTOMER ADDRESS (origin - from original order)
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

    // Validate customer address
    if (
      !customerAddress.address_line1 ||
      !customerAddress.city_locality ||
      !customerAddress.state_province ||
      !customerAddress.postal_code
    ) {
      return NextResponse.json(
        { error: "Incomplete customer address" },
        { status: 400 }
      );
    }

    // ===================================================================
    // CREATE RETURN LABELS via ShipEngine
    // ===================================================================
    const carrierCode = "stamps_com"; // USPS
    const serviceCode = "usps_ground_advantage"; // Cheapest

    console.log(
      `Creating ${packageCount} return label(s) with USPS Ground Advantage`
    );

    const returnPackages = [];
    let totalShippingCost = 0;

    // Create labels in parallel for speed
    const labelPromises = Array.from({ length: packageCount }, (_, i) =>
      createReturnLabel({
        packageNumber: i + 1,
        rmaNumber: returnOrder.rmaNumber,
        customerAddress,
        warehouseAddress,
      })
    );

    const labelResults = await Promise.allSettled(labelPromises);

    for (const result of labelResults) {
      if (result.status === "fulfilled") {
        returnPackages.push(result.value);
        totalShippingCost += result.value.cost;
      } else {
        console.error("Label creation failed:", result.reason);
      }
    }

    // Check if we got any labels
    if (returnPackages.length === 0) {
      return NextResponse.json(
        { error: "Failed to create any return labels" },
        { status: 500 }
      );
    }

    console.log(`✅ Created ${returnPackages.length} return label(s)`);
    console.log(
      `💰 Total return shipping cost: $${totalShippingCost.toFixed(2)}`
    );

    // ===================================================================
    // SAVE TO DATABASE (comma-separated, like outbound orders)
    // ===================================================================
    const trackingNumbers = returnPackages
      .map((pkg) => pkg.trackingNumber)
      .join(", ");
    const labelUrls = returnPackages.map((pkg) => pkg.labelUrl).join(", ");

    await prisma.returnOrder.update({
      where: { id: returnOrder.id },
      data: {
        returnTrackingNumber: trackingNumbers, // ✅ Comma-separated
        returnCarrier: carrierCode,
        returnLabelUrl: labelUrls, // ✅ Comma-separated (NEW FIELD - add to schema)
        returnShippingCost: new Prisma.Decimal(totalShippingCost), // ✅ NEW FIELD
        packagesExpected: packageCount, // ✅ NEW FIELD
        labelCreatedAt: new Date(), // ✅ NEW FIELD
        status: "APPROVED", // Move from PENDING to APPROVED
      },
    });

    console.log(`✅ Return labels saved to database`);

    // ===================================================================
    // RESPONSE
    // ===================================================================
    return NextResponse.json({
      success: true,
      returnOrderId: returnOrder.id,
      rmaNumber: returnOrder.rmaNumber,
      packageCount: returnPackages.length,
      totalCost: totalShippingCost,
      packages: returnPackages.map((pkg) => ({
        packageNumber: pkg.packageNumber,
        trackingNumber: pkg.trackingNumber,
        labelUrl: pkg.labelUrl,
        cost: pkg.cost,
      })),
      message: `${returnPackages.length} return label(s) created successfully`,
    });
  } catch (error) {
    console.error("Error creating return label:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to create return label";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ===================================================================
// HELPER: Create single return label via ShipEngine
// ===================================================================
async function createReturnLabel(params: {
  packageNumber: number;
  rmaNumber: string;
  customerAddress: any;
  warehouseAddress: any;
}) {
  const shipment = {
    carrier_code: "stamps_com",
    service_code: "usps_ground_advantage",
    ship_from: params.customerAddress, // ⬅️ FROM customer
    ship_to: params.warehouseAddress, // ⬅️ TO warehouse
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
      custom_field1: params.rmaNumber,
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
      label_layout: "letter", // 8.5x11 for easy home printing
      label_download_type: "url",
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Label ${params.packageNumber} failed: ${
        error?.message || response.statusText
      }`
    );
  }

  const label = await response.json();

  console.log(
    `✅ Return label ${params.packageNumber} created: ${label.tracking_number}`
  );

  return {
    packageNumber: params.packageNumber,
    trackingNumber: label.tracking_number,
    labelUrl: label.label_download?.pdf || label.label_download?.href,
    cost: label.shipment_cost?.amount || 0,
  };
}
