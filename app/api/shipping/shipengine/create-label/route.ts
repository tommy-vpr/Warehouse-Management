import { NextRequest, NextResponse } from "next/server";
import { shipengine } from "@/lib/shipengine";
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
      orderId,
      serviceCode,
      carrierCode,
      packages,
      shippingAddress,
      notes,
    } = await request.json();

    // Enhanced validation
    if (!orderId || !packages || packages.length === 0) {
      return NextResponse.json(
        { error: "Order ID and at least one package are required" },
        { status: 400 }
      );
    }

    if (!carrierCode || !serviceCode) {
      return NextResponse.json(
        { error: "Carrier code and service code are required" },
        { status: 400 }
      );
    }

    // Validate package structure
    for (const [idx, pkg] of packages.entries()) {
      if (!pkg.weight || pkg.weight <= 0) {
        return NextResponse.json(
          { error: `Package ${idx + 1} must have a valid weight` },
          { status: 400 }
        );
      }
    }

    console.log(`Creating shipping labels for order: ${orderId}`);
    console.log("Packages:", JSON.stringify(packages, null, 2));
    console.log("Carrier Code:", carrierCode);
    console.log("Service Code:", serviceCode);

    // Get order with better error handling
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            productVariant: { include: { product: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "PACKED") {
      return NextResponse.json(
        { error: "Order must be packed before shipping" },
        { status: 400 }
      );
    }

    // Warehouse address with validation
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

    // Better address handling
    const addr = shippingAddress || order.shippingAddress;
    if (!addr) {
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 }
      );
    }

    const customerAddress = {
      name: addr.name || order.customerName || "Customer",
      company_name: addr.company || undefined,
      address_line1: addr.address1 || addr.addressLine1,
      address_line2: addr.address2 || addr.addressLine2 || undefined,
      city_locality: addr.city,
      state_province: addr.province_code || addr.province || addr.stateProvince,
      postal_code: addr.zip || addr.postalCode,
      country_code: addr.country_code || addr.countryCode || "US",
      phone: addr.phone || "555-123-4567",
      address_residential_indicator: "yes" as const,
    };

    // Validate required address fields
    if (
      !customerAddress.address_line1 ||
      !customerAddress.city_locality ||
      !customerAddress.state_province ||
      !customerAddress.postal_code
    ) {
      return NextResponse.json(
        { error: "Incomplete shipping address - missing required fields" },
        { status: 400 }
      );
    }

    // Build shipment with proper carrier code
    const shipment = {
      carrier_code: carrierCode,
      service_code: serviceCode,
      ship_from: warehouseAddress,
      ship_to: customerAddress,
      packages: packages.map((pkg: any, idx: number) => ({
        package_code: pkg.packageCode || "package",
        weight: {
          value: Math.max(pkg.weight || 1, 0.1),
          unit: "pound" as const,
        },
        dimensions: {
          unit: "inch" as const,
          length: Math.max(pkg.length || 10, 1),
          width: Math.max(pkg.width || 8, 1),
          height: Math.max(pkg.height || 6, 1),
        },
        label_messages: {
          reference1: order.orderNumber,
          reference2: notes || `Package ${idx + 1} of ${packages.length}`,
        },
      })),
    };

    console.log("Final shipment payload:", JSON.stringify(shipment, null, 2));

    // Enhanced carrier/service compatibility validation
    const validateCarrierService = (carrier: string, service: string) => {
      const validations = [
        {
          condition: carrier === "stamps_com" && service.startsWith("ups_"),
          error:
            "Service code mismatch: UPS service selected with USPS carrier",
        },
        {
          condition: carrier === "ups" && service.startsWith("usps_"),
          error:
            "Service code mismatch: USPS service selected with UPS carrier",
        },
        {
          condition:
            carrier === "fedex" &&
            (service.startsWith("usps_") || service.startsWith("ups_")),
          error:
            "Service code mismatch: Non-FedEx service selected with FedEx carrier",
        },
      ];

      for (const validation of validations) {
        if (validation.condition) {
          return validation.error;
        }
      }
      return null;
    };

    const validationError = validateCarrierService(carrierCode, serviceCode);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Create labels with better error handling
    let label;
    try {
      const response = await fetch("https://api.shipengine.com/v1/labels", {
        method: "POST",
        headers: {
          "API-Key": process.env.SHIPENGINE_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shipment: shipment,
          label_format: "pdf",
          label_layout: "4x6",
          label_download_type: "url",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          "ShipEngine API Error:",
          JSON.stringify(errorData, null, 2)
        );
        throw new Error(
          `ShipEngine API Error: ${response.status} - ${
            errorData.message || response.statusText
          }`
        );
      }

      label = await response.json();
    } catch (shipEngineError: unknown) {
      console.error("ShipEngine API Error:", shipEngineError);

      console.error("🚨 SHIPENGINE ERROR DETAILS:");
      console.error("Error message:", (shipEngineError as any).message);

      if ((shipEngineError as any).response?.data) {
        console.error("ShipEngine Error Details:");
        console.error(
          JSON.stringify((shipEngineError as any).response.data, null, 2)
        );

        // Specifically log the errors array
        if ((shipEngineError as any).response.data.errors) {
          console.error("Specific Errors:");
          (shipEngineError as any).response.data.errors.forEach(
            (err: any, idx: number) => {
              console.error(`Error ${idx + 1}:`, JSON.stringify(err, null, 2));
            }
          );
        }
      }

      const errorMessage =
        shipEngineError instanceof Error
          ? shipEngineError.message
          : "ShipEngine API request failed";
      return NextResponse.json(
        { error: `Label creation failed: ${errorMessage}` },
        { status: 422 }
      );
    }

    // Validate label response
    if (!label || !label.tracking_number) {
      return NextResponse.json(
        { error: "Invalid response from ShipEngine - no tracking number" },
        { status: 500 }
      );
    }

    console.log("ShipEngine label response:", JSON.stringify(label, null, 2));

    // ShipEngine returns a single label object with packages array inside
    let labelPackages = label.packages || [];

    // For single package shipments, create a package entry from the main label
    if (labelPackages.length === 0 && label.tracking_number) {
      labelPackages = [
        {
          package_id: label.label_id,
          tracking_number: label.tracking_number,
          label_download: label.label_download,
          weight: { value: packages[0]?.weight || 1, unit: "pound" },
          dimensions: {
            length: packages[0]?.length || 10,
            width: packages[0]?.width || 8,
            height: packages[0]?.height || 6,
            unit: "inch",
          },
        },
      ];
    }

    // Use database transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create shipping packages with safer indexing
      const shippingPackages = await Promise.all(
        labelPackages.map((pkg: any, idx: number) => {
          const originalPackage = packages[Math.min(idx, packages.length - 1)]; // Safe indexing

          return tx.shippingPackage.create({
            data: {
              orderId: order.id,
              carrierCode: carrierCode,
              serviceCode: serviceCode,
              packageCode: originalPackage?.packageCode || "package",
              trackingNumber: pkg.tracking_number,
              labelUrl: pkg.label_download?.pdf || pkg.label_download?.href,
              cost: new Prisma.Decimal(label.shipment_cost?.amount || 0),
              currency: label.shipment_cost?.currency || "USD",
              weight: new Prisma.Decimal(
                pkg.weight?.value || originalPackage?.weight || 1
              ),
              dimensions: {
                length: pkg.dimensions?.length || originalPackage?.length || 10,
                width: pkg.dimensions?.width || originalPackage?.width || 8,
                height: pkg.dimensions?.height || originalPackage?.height || 6,
                unit: "inch",
              },
            },
          });
        })
      );

      // Update order
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "SHIPPED",
          trackingNumber: label.tracking_number,
          trackingUrl: label.tracking_url || label.label_download?.pdf,
          shippedAt: new Date(),
          shippingStatus: "SHIPPED",
          shippingCost: label.shipment_cost?.amount?.toString(),
          shippingCarrier: carrierCode,
          shippingService: serviceCode,
          labelUrl: label.label_download?.pdf || label.label_download?.href,
          notes: notes || `Shipped with ${labelPackages.length} package(s)`,
        },
      });

      return { shippingPackages, updatedOrder };
    });

    return NextResponse.json({
      success: true,
      label: {
        trackingNumber: label.tracking_number,
        cost: label.shipment_cost?.amount,
        labelUrl: label.label_download?.pdf || label.label_download?.href,
        trackingUrl: label.tracking_url,
      },
      labels: labelPackages.map((pkg: any) => ({
        trackingNumber: pkg.tracking_number,
        cost: label.shipment_cost?.amount, // Cost is shared across packages
        labelUrl: pkg.label_download?.pdf || pkg.label_download?.href,
      })),
      orderId: order.id,
      orderNumber: order.orderNumber,
      isTestLabel: process.env.SHIPENGINE_SANDBOX === "true",
    });
  } catch (error) {
    console.error("Error creating ShipEngine label:", error);

    // More specific error handling
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: "Database error occurred while creating shipping label" },
        { status: 500 }
      );
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create shipping label";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
