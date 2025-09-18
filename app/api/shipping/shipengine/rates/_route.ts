// app/api/shipengine/rates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { shipengine } from "@/lib/shipengine";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, packageInfo, shippingAddress } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    console.log(`📊 Getting shipping rates for order: ${orderId}`);

    // Get order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Warehouse address
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

    // Map Shopify address format to ShipEngine format
    const shippingAddr = order.shippingAddress as any;
    const customerAddress = {
      name: shippingAddr?.name || order.customerName || "Customer",
      company_name: shippingAddr?.company || undefined,
      address_line1: shippingAddr?.address1 || "123 Customer St",
      address_line2: shippingAddr?.address2 || undefined,
      city_locality: shippingAddr?.city || "Customer City",
      state_province:
        shippingAddr?.province_code || shippingAddr?.province || "CA",
      postal_code: shippingAddr?.zip || "90210",
      country_code: shippingAddr?.country_code || "US",
      phone: shippingAddr?.phone || "555-123-4567",
      address_residential_indicator: "yes" as const,
    };

    // Calculate package weight (use packageInfo if provided, otherwise calculate from order)
    const packageWeight =
      packageInfo?.weight ||
      order.items.reduce(
        (total, item) =>
          total + (Number(item.productVariant.weight) || 1) * item.quantity,
        0
      ) ||
      1;

    // Use package dimensions if provided, otherwise use defaults
    const packageDimensions = packageInfo?.dimensions || {
      length: 12,
      width: 9,
      height: 6,
      unit: "inch",
    };

    // Create rate request
    const rateRequest = {
      ship_from: warehouseAddress,
      ship_to: customerAddress,
      packages: [
        {
          weight: {
            value: packageWeight,
            unit: "pound" as const,
          },
          dimensions: {
            unit: "inch" as const,
            length: packageDimensions.length,
            width: packageDimensions.width,
            height: packageDimensions.height,
          },
          package_code: packageInfo?.packageCode || "package",
        },
      ],
      // Request rates from multiple carriers
      carrier_ids: [
        // Add your carrier IDs here - get from ShipEngine dashboard
        // Example: "se-123456" for USPS, "se-654321" for FedEx
      ],
    };

    console.log("📦 Getting rates with package info:", {
      weight: packageWeight,
      dimensions: packageDimensions,
      packageCode: packageInfo?.packageCode || "package",
    });

    // Create shipment object for rates request
    const shipment = {
      ship_from: warehouseAddress,
      ship_to: customerAddress,
      packages: [
        {
          weight: {
            value: packageWeight,
            unit: "pound" as const,
          },
          dimensions: {
            unit: "inch" as const,
            length: packageDimensions.length,
            width: packageDimensions.width,
            height: packageDimensions.height,
          },
          package_code: packageInfo?.packageCode || "package",
        },
      ],
    };

    console.log("📦 Getting rates with package info:", {
      weight: packageWeight,
      dimensions: packageDimensions,
      packageCode: packageInfo?.packageCode || "package",
    });

    // Get rates from ShipEngine using your existing method
    const ratesResponse = await shipengine.getRates(shipment);

    // Transform rates to match your interface format
    const transformedRates =
      ratesResponse.rate_response?.rates?.map((rate: any) => ({
        serviceCode: rate.service_code,
        serviceName: rate.service_type,
        carrierCode: rate.carrier_code,
        carrierName: rate.carrier_friendly_name,
        rate: parseFloat(rate.shipping_amount.amount),
        estimatedDays: rate.estimated_delivery_days
          ? `${rate.estimated_delivery_days} business days`
          : "2-5 business days",
        deliveryDate: rate.delivery_date,
        guaranteedService: rate.guaranteed_service,
        trackable: rate.trackable,
        carrierDeliveryDays: rate.carrier_delivery_days,
        negotiatedRate: rate.negotiated_rate,
      })) || [];

    // Sort rates by price (cheapest first)
    transformedRates.sort((a: any, b: any) => a.rate - b.rate);

    console.log(`✅ Found ${transformedRates.length} shipping rates`);

    return NextResponse.json({
      success: true,
      rates: transformedRates,
      orderId: order.id,
      orderNumber: order.orderNumber,
      packageInfo: {
        weight: packageWeight,
        dimensions: packageDimensions,
        packageCode: packageInfo?.packageCode || "package",
      },
      addresses: {
        warehouse: warehouseAddress,
        customer: customerAddress,
      },
      message: `Found ${transformedRates.length} shipping options`,
    });
  } catch (error) {
    console.error("❌ Error getting ShipEngine rates:", error);

    // Fallback to mock rates if ShipEngine fails
    const mockRates = [
      {
        serviceCode: "usps_ground_advantage",
        serviceName: "USPS Ground Advantage",
        carrierCode: "usps",
        carrierName: "USPS",
        rate: 8.45,
        estimatedDays: "2-5 business days",
        guaranteedService: false,
        trackable: true,
      },
      {
        serviceCode: "usps_priority_mail",
        serviceName: "USPS Priority Mail",
        carrierCode: "usps",
        carrierName: "USPS",
        rate: 12.8,
        estimatedDays: "1-3 business days",
        guaranteedService: false,
        trackable: true,
      },
      {
        serviceCode: "fedex_ground",
        serviceName: "FedEx Ground",
        carrierCode: "fedex",
        carrierName: "FedEx",
        rate: 10.25,
        estimatedDays: "1-5 business days",
        guaranteedService: false,
        trackable: true,
      },
      {
        serviceCode: "ups_ground",
        serviceName: "UPS Ground",
        carrierCode: "ups",
        carrierName: "UPS",
        rate: 9.75,
        estimatedDays: "1-5 business days",
        guaranteedService: false,
        trackable: true,
      },
    ];

    console.log("📦 Using fallback mock rates due to error");

    return NextResponse.json({
      success: true,
      rates: mockRates,
      fallback: true,
      error: error instanceof Error ? error.message : "ShipEngine API error",
      message: "Using fallback rates due to API error",
    });
  }
}
