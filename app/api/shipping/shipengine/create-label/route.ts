// app/api/shipping/create-label/route.ts
import { NextRequest, NextResponse } from "next/server";
import { shipengine } from "@/lib/shipengine";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

    // Allow shipping if order is PACKED or already partially SHIPPED
    if (!["PACKED", "SHIPPED"].includes(order.status)) {
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

    // Helper function to truncate reference messages based on carrier
    const truncateReference = (text: string, carrierCode: string): string => {
      let maxLength = 35; // Default UPS limit

      switch (carrierCode.toLowerCase()) {
        case "ups":
          maxLength = 35;
          break;
        case "fedex":
          maxLength = 30;
          break;
        case "stamps_com":
        case "usps":
          maxLength = 50;
          break;
        default:
          maxLength = 30;
      }

      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + "...";
    };

    // Build shipment with proper carrier code
    const shipment = {
      carrier_code: carrierCode,
      service_code: serviceCode,
      ship_from: warehouseAddress,
      ship_to: customerAddress,
      packages: packages.map((pkg: any, idx: number) => {
        const baseReference1 = order.orderNumber;
        const baseReference2 =
          notes || `Package ${idx + 1} of ${packages.length}`;

        return {
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
            reference1: truncateReference(baseReference1, carrierCode),
            reference2: truncateReference(baseReference2, carrierCode),
          },
        };
      }),
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

    // ✅ UPDATED: Use database transaction with back order detection
    const result = await prisma.$transaction(async (tx) => {
      // ✅ NEW: Calculate per-package cost
      const totalShipmentCost = label.shipment_cost?.amount || 0;
      const numberOfPackages = labelPackages.length;
      const costPerPackage =
        numberOfPackages > 0
          ? totalShipmentCost / numberOfPackages
          : totalShipmentCost;

      console.log(`💰 Total shipment cost: $${totalShipmentCost}`);
      console.log(`📦 Number of packages: ${numberOfPackages}`);
      console.log(`💵 Cost per package: $${costPerPackage}`);

      // Create shipping packages
      const shippingPackages = await Promise.all(
        labelPackages.map((pkg: any, idx: number) => {
          const originalPackage = packages[Math.min(idx, packages.length - 1)];

          return tx.shippingPackage.create({
            data: {
              orderId: order.id,
              carrierCode: carrierCode,
              serviceCode: serviceCode,
              packageCode: originalPackage?.packageCode || "package",
              trackingNumber: pkg.tracking_number,
              labelUrl: pkg.label_download?.pdf || pkg.label_download?.href,
              cost: new Prisma.Decimal(costPerPackage), // ✅ FIXED: Use divided cost
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

      // ✅ CHECK: Are we shipping a back order?
      // ✅ CHECK: Are we shipping a back order?
      const activeBackOrders = await tx.backOrder.findMany({
        where: {
          orderId: orderId,
          status: {
            in: ["ALLOCATED", "PICKING", "PICKED", "PACKED"],
          },
        },
        include: {
          productVariant: {
            select: {
              sku: true,
            },
          },
        },
      });

      const isBackOrderShipment = activeBackOrders.length > 0;

      console.log(
        `📦 Shipment type: ${
          isBackOrderShipment ? "BACK_ORDER" : "INITIAL_ORDER"
        }`
      );

      if (isBackOrderShipment) {
        console.log(
          `📦 Found ${activeBackOrders.length} active back order(s):`
        );
        activeBackOrders.forEach((bo) => {
          console.log(
            `   - ${bo.productVariant?.sku}: ${bo.quantityBackOrdered} units (${bo.status})`
          );
        });
      }

      // ✅ Get ONLY the reservations for items we're shipping now
      let reservationsToRelease;

      if (isBackOrderShipment) {
        // ✅ BACK ORDER: Only release reservations created for back orders
        const backOrderProductIds = activeBackOrders.map(
          (bo) => bo.productVariantId
        );

        reservationsToRelease = await tx.inventoryReservation.findMany({
          where: {
            orderId: orderId,
            productVariantId: { in: backOrderProductIds },
            status: "ACTIVE",
          },
        });

        console.log(
          `📦 Back order shipment: Found ${reservationsToRelease.length} reservations to release`
        );
        console.log(`   Products: ${backOrderProductIds.join(", ")}`);
      } else {
        // ✅ INITIAL ORDER: Release all active reservations
        reservationsToRelease = await tx.inventoryReservation.findMany({
          where: {
            orderId: orderId,
            status: "ACTIVE",
          },
        });

        console.log(
          `📦 Initial order shipment: Found ${reservationsToRelease.length} reservations to release`
        );
      }

      // ✅ Verify we found the right amount
      const totalToRelease = reservationsToRelease.reduce(
        (sum, r) => sum + r.quantity,
        0
      );
      console.log(`📦 Total units to release: ${totalToRelease}`);

      // ✅ Release inventory for ONLY the reservations we found (SINGLE LOOP)
      for (const reservation of reservationsToRelease) {
        console.log(
          `   - Releasing ${reservation.quantity} units of product ${reservation.productVariantId} from location ${reservation.locationId}`
        );

        // Update inventory
        await tx.inventory.update({
          where: {
            productVariantId_locationId: {
              productVariantId: reservation.productVariantId,
              locationId: reservation.locationId,
            },
          },
          data: {
            quantityReserved: { decrement: reservation.quantity },
            quantityOnHand: { decrement: reservation.quantity },
          },
        });

        // Create inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            productVariantId: reservation.productVariantId,
            locationId: reservation.locationId,
            transactionType: "SALE",
            quantityChange: -reservation.quantity,
            referenceId: orderId,
            referenceType: "SHIPMENT_LABEL_CREATED",
            userId: session.user.id,
            notes: `Released ${reservation.quantity} units for order ${
              order.orderNumber
            } - Tracking: ${label.tracking_number}${
              isBackOrderShipment ? " (Back Order)" : ""
            }`,
          },
        });
      }

      // ✅ Mark ONLY these reservations as FULFILLED
      await tx.inventoryReservation.updateMany({
        where: {
          id: { in: reservationsToRelease.map((r) => r.id) },
          status: "ACTIVE",
        },
        data: {
          status: "FULFILLED",
        },
      });

      // ✅ Mark back orders as FULFILLED
      if (isBackOrderShipment) {
        for (const backOrder of activeBackOrders) {
          await tx.backOrder.update({
            where: { id: backOrder.id },
            data: {
              status: "FULFILLED",
              fulfilledAt: new Date(),
              quantityFulfilled: backOrder.quantityBackOrdered,
            },
          });
        }
        console.log(
          `✅ Marked ${activeBackOrders.length} back order(s) as fulfilled`
        );
      }

      // ✅ NEW: Create Shopify fulfillment
      if (order.shopifyOrderId) {
        // ✅ MOVE: Declare outside try block so it's available in catch
        let itemsToFulfill: Array<{
          variantId?: string;
          sku: string;
          quantity: number;
        }> = [];

        try {
          console.log(
            `📦 Creating Shopify fulfillment for order ${order.shopifyOrderId}`
          );

          // Determine which items are being shipped
          if (isBackOrderShipment) {
            // Back order shipment - fulfill only back-ordered items
            console.log(`📦 This is a BACK ORDER shipment`);

            const backOrderProductIds = activeBackOrders.map(
              (bo) => bo.productVariantId
            );

            for (const item of order.items) {
              if (backOrderProductIds.includes(item.productVariantId)) {
                const backOrder = activeBackOrders.find(
                  (bo) => bo.productVariantId === item.productVariantId
                );

                itemsToFulfill.push({
                  variantId: item.productVariant.shopifyVariantId
                    ? `gid://shopify/ProductVariant/${item.productVariant.shopifyVariantId}`
                    : undefined,
                  sku: item.productVariant.sku,
                  quantity: backOrder?.quantityBackOrdered || item.quantity,
                });
              }
            }
          } else {
            // ✅ FIXED: Initial shipment - fulfill only what we ACTUALLY shipped
            console.log(`📦 This is an INITIAL shipment`);

            // ✅ Build map of what we actually shipped (from reservations released)
            const shippedQuantities = new Map<string, number>();

            for (const reservation of reservationsToRelease) {
              const currentQty =
                shippedQuantities.get(reservation.productVariantId) || 0;
              shippedQuantities.set(
                reservation.productVariantId,
                currentQty + reservation.quantity
              );
            }

            console.log(
              `📦 Actually shipped quantities:`,
              Object.fromEntries(shippedQuantities)
            );

            // ✅ Only fulfill items we actually shipped with correct quantities
            itemsToFulfill = order.items
              .filter((item) => shippedQuantities.has(item.productVariantId))
              .map((item) => {
                const shippedQty =
                  shippedQuantities.get(item.productVariantId) || 0;

                return {
                  variantId: item.productVariant.shopifyVariantId
                    ? `gid://shopify/ProductVariant/${item.productVariant.shopifyVariantId}`
                    : undefined,
                  sku: item.productVariant.sku,
                  quantity: shippedQty, // ✅ Use ACTUAL shipped quantity
                };
              });

            const totalShipping = itemsToFulfill.reduce(
              (sum, i) => sum + i.quantity,
              0
            );
            console.log(
              `📦 Fulfilling ${totalShipping} units in Shopify (may be partial)`
            );
          }

          // Create fulfillment in Shopify
          const fulfillmentResult = await updateShopifyFulfillment({
            orderId: order.shopifyOrderId,
            trackingNumber: label.tracking_number,
            trackingUrl: label.tracking_url,
            trackingCompany: getShopifyCarrierName(carrierCode),
            lineItems: itemsToFulfill,
            notifyCustomer: true,
            isBackOrder: isBackOrderShipment,
          });

          console.log(
            `✅ Shopify fulfillment created: ${fulfillmentResult.fulfillmentId}`
          );

          // Store Shopify fulfillment ID
          await tx.order.update({
            where: { id: order.id },
            data: {
              shopifyFulfillmentIds: order.shopifyFulfillmentIds
                ? `${order.shopifyFulfillmentIds},${fulfillmentResult.fulfillmentId}`
                : fulfillmentResult.fulfillmentId,
            },
          });
        } catch (shopifyError) {
          // ⚠️ Log but don't fail the entire shipment if Shopify update fails
          console.error(
            "⚠️ Failed to create Shopify fulfillment:",
            shopifyError
          );

          // ✅ Create a sync task for manual retry later (no cron job needed)
          await tx.shopifySync.create({
            data: {
              orderId: order.id,
              syncType: "FULFILLMENT",
              status: "PENDING",
              attempts: 0,
              data: {
                trackingNumber: label.tracking_number,
                trackingUrl: label.tracking_url,
                carrier: carrierCode,
                isBackOrder: isBackOrderShipment,
                itemsToFulfill, // ✅ Now accessible here
              },
              error:
                shopifyError instanceof Error
                  ? shopifyError.message
                  : "Unknown error",
            },
          });

          console.log("📝 Shopify sync task created for manual retry");
        }
      }

      // ✅ CHECK: Are there still pending back orders?
      const pendingBackOrders = await tx.backOrder.findMany({
        where: {
          orderId: orderId,
          status: {
            in: ["PENDING", "ALLOCATED", "PICKING", "PICKED"], // Not yet shipped
          },
        },
      });

      const hasPendingBackOrders = pendingBackOrders.length > 0;

      // Update order details
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          trackingNumber: order.trackingNumber
            ? `${order.trackingNumber}, ${label.tracking_number}`
            : label.tracking_number,
          trackingUrl: label.tracking_url || label.label_download?.pdf,
          shippedAt: order.shippedAt || new Date(),
          shippingStatus: hasPendingBackOrders
            ? "PARTIALLY_SHIPPED"
            : "SHIPPED",
          shippingCost: order.shippingCost
            ? (
                parseFloat(order.shippingCost) +
                (label.shipment_cost?.amount || 0)
              ).toString()
            : label.shipment_cost?.amount?.toString(),
          shippingCarrier: order.shippingCarrier
            ? `${order.shippingCarrier}, ${carrierCode}`
            : carrierCode,
          shippingService: order.shippingService
            ? `${order.shippingService}, ${serviceCode}`
            : serviceCode,
          labelUrl: order.labelUrl
            ? `${order.labelUrl}, ${
                label.label_download?.pdf || label.label_download?.href
              }`
            : label.label_download?.pdf || label.label_download?.href,
          notes: `${order.notes || ""} ${
            notes || `Shipped with ${labelPackages.length} package(s)`
          }`.trim(),
        },
      });

      // ✅ CRITICAL: Set correct status based on back orders
      const newStatus = hasPendingBackOrders ? "PARTIALLY_SHIPPED" : "SHIPPED";
      const statusNotes = hasPendingBackOrders
        ? `Partially shipped via ${carrierCode.toUpperCase()} - ${
            pendingBackOrders.length
          } item(s) still on back order - Tracking: ${label.tracking_number}`
        : `Shipped via ${carrierCode.toUpperCase()} - Tracking: ${
            label.tracking_number
          }`;

      await updateOrderStatus({
        orderId: order.id,
        newStatus,
        userId: session.user.id,
        notes: statusNotes,
        tx,
      });

      return {
        shippingPackages,
        updatedOrder,
        hasPendingBackOrders,
        reservationsReleased: reservationsToRelease.length,
        totalUnitsReleased: totalToRelease,
      };
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
        cost: label.shipment_cost?.amount,
        labelUrl: pkg.label_download?.pdf || pkg.label_download?.href,
      })),
      orderId: order.id,
      orderNumber: order.orderNumber,
      isTestLabel: process.env.SHIPENGINE_SANDBOX === "true",
    });
  } catch (error) {
    console.error("Error creating ShipEngine label:", error);

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

// // app/api/shipping/create-label/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { shipengine } from "@/lib/shipengine";
// import { prisma } from "@/lib/prisma";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { Prisma } from "@prisma/client";
// import { updateOrderStatus } from "@/lib/order-status-helper";

// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const {
//       orderId,
//       serviceCode,
//       carrierCode,
//       packages,
//       shippingAddress,
//       notes,
//     } = await request.json();

//     // Enhanced validation
//     if (!orderId || !packages || packages.length === 0) {
//       return NextResponse.json(
//         { error: "Order ID and at least one package are required" },
//         { status: 400 }
//       );
//     }

//     if (!carrierCode || !serviceCode) {
//       return NextResponse.json(
//         { error: "Carrier code and service code are required" },
//         { status: 400 }
//       );
//     }

//     // Validate package structure
//     for (const [idx, pkg] of packages.entries()) {
//       if (!pkg.weight || pkg.weight <= 0) {
//         return NextResponse.json(
//           { error: `Package ${idx + 1} must have a valid weight` },
//           { status: 400 }
//         );
//       }
//     }

//     console.log(`Creating shipping labels for order: ${orderId}`);
//     console.log("Packages:", JSON.stringify(packages, null, 2));
//     console.log("Carrier Code:", carrierCode);
//     console.log("Service Code:", serviceCode);

//     // Get order with better error handling
//     const order = await prisma.order.findUnique({
//       where: { id: orderId },
//       include: {
//         items: {
//           include: {
//             productVariant: { include: { product: true } },
//           },
//         },
//       },
//     });

//     if (!order) {
//       return NextResponse.json({ error: "Order not found" }, { status: 404 });
//     }

//     // Allow shipping if order is PACKED or already partially SHIPPED
//     if (!["PACKED", "SHIPPED"].includes(order.status)) {
//       return NextResponse.json(
//         { error: "Order must be packed before shipping" },
//         { status: 400 }
//       );
//     }

//     // Warehouse address with validation
//     const warehouseAddress = {
//       name: process.env.WAREHOUSE_NAME || "WMS Warehouse",
//       company_name: process.env.WAREHOUSE_COMPANY || "Your Company",
//       address_line1: process.env.WAREHOUSE_ADDRESS1 || "123 Warehouse St",
//       city_locality: process.env.WAREHOUSE_CITY || "Los Angeles",
//       state_province: process.env.WAREHOUSE_STATE || "CA",
//       postal_code: process.env.WAREHOUSE_ZIP || "90210",
//       country_code: "US",
//       phone: process.env.WAREHOUSE_PHONE || "555-123-4567",
//     };

//     // Better address handling
//     const addr = shippingAddress || order.shippingAddress;
//     if (!addr) {
//       return NextResponse.json(
//         { error: "Shipping address is required" },
//         { status: 400 }
//       );
//     }

//     const customerAddress = {
//       name: addr.name || order.customerName || "Customer",
//       company_name: addr.company || undefined,
//       address_line1: addr.address1 || addr.addressLine1,
//       address_line2: addr.address2 || addr.addressLine2 || undefined,
//       city_locality: addr.city,
//       state_province: addr.province_code || addr.province || addr.stateProvince,
//       postal_code: addr.zip || addr.postalCode,
//       country_code: addr.country_code || addr.countryCode || "US",
//       phone: addr.phone || "555-123-4567",
//       address_residential_indicator: "yes" as const,
//     };

//     // Validate required address fields
//     if (
//       !customerAddress.address_line1 ||
//       !customerAddress.city_locality ||
//       !customerAddress.state_province ||
//       !customerAddress.postal_code
//     ) {
//       return NextResponse.json(
//         { error: "Incomplete shipping address - missing required fields" },
//         { status: 400 }
//       );
//     }

//     // Helper function to truncate reference messages based on carrier
//     const truncateReference = (text: string, carrierCode: string): string => {
//       let maxLength = 35; // Default UPS limit

//       switch (carrierCode.toLowerCase()) {
//         case "ups":
//           maxLength = 35;
//           break;
//         case "fedex":
//           maxLength = 30;
//           break;
//         case "stamps_com":
//         case "usps":
//           maxLength = 50;
//           break;
//         default:
//           maxLength = 30;
//       }

//       if (text.length <= maxLength) return text;
//       return text.substring(0, maxLength - 3) + "...";
//     };

//     // Build shipment with proper carrier code
//     const shipment = {
//       carrier_code: carrierCode,
//       service_code: serviceCode,
//       ship_from: warehouseAddress,
//       ship_to: customerAddress,
//       packages: packages.map((pkg: any, idx: number) => {
//         const baseReference1 = order.orderNumber;
//         const baseReference2 =
//           notes || `Package ${idx + 1} of ${packages.length}`;

//         return {
//           package_code: pkg.packageCode || "package",
//           weight: {
//             value: Math.max(pkg.weight || 1, 0.1),
//             unit: "pound" as const,
//           },
//           dimensions: {
//             unit: "inch" as const,
//             length: Math.max(pkg.length || 10, 1),
//             width: Math.max(pkg.width || 8, 1),
//             height: Math.max(pkg.height || 6, 1),
//           },
//           label_messages: {
//             reference1: truncateReference(baseReference1, carrierCode),
//             reference2: truncateReference(baseReference2, carrierCode),
//           },
//         };
//       }),
//     };

//     console.log("Final shipment payload:", JSON.stringify(shipment, null, 2));

//     // Enhanced carrier/service compatibility validation
//     const validateCarrierService = (carrier: string, service: string) => {
//       const validations = [
//         {
//           condition: carrier === "stamps_com" && service.startsWith("ups_"),
//           error:
//             "Service code mismatch: UPS service selected with USPS carrier",
//         },
//         {
//           condition: carrier === "ups" && service.startsWith("usps_"),
//           error:
//             "Service code mismatch: USPS service selected with UPS carrier",
//         },
//         {
//           condition:
//             carrier === "fedex" &&
//             (service.startsWith("usps_") || service.startsWith("ups_")),
//           error:
//             "Service code mismatch: Non-FedEx service selected with FedEx carrier",
//         },
//       ];

//       for (const validation of validations) {
//         if (validation.condition) {
//           return validation.error;
//         }
//       }
//       return null;
//     };

//     const validationError = validateCarrierService(carrierCode, serviceCode);
//     if (validationError) {
//       return NextResponse.json({ error: validationError }, { status: 400 });
//     }

//     // Create labels with better error handling
//     let label;
//     try {
//       const response = await fetch("https://api.shipengine.com/v1/labels", {
//         method: "POST",
//         headers: {
//           "API-Key": process.env.SHIPENGINE_API_KEY!,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           shipment: shipment,
//           label_format: "pdf",
//           label_layout: "4x6",
//           label_download_type: "url",
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         console.error(
//           "ShipEngine API Error:",
//           JSON.stringify(errorData, null, 2)
//         );
//         throw new Error(
//           `ShipEngine API Error: ${response.status} - ${
//             errorData.message || response.statusText
//           }`
//         );
//       }

//       label = await response.json();
//     } catch (shipEngineError: unknown) {
//       console.error("ShipEngine API Error:", shipEngineError);
//       console.error("🚨 SHIPENGINE ERROR DETAILS:");
//       console.error("Error message:", (shipEngineError as any).message);

//       if ((shipEngineError as any).response?.data) {
//         console.error("ShipEngine Error Details:");
//         console.error(
//           JSON.stringify((shipEngineError as any).response.data, null, 2)
//         );

//         if ((shipEngineError as any).response.data.errors) {
//           console.error("Specific Errors:");
//           (shipEngineError as any).response.data.errors.forEach(
//             (err: any, idx: number) => {
//               console.error(`Error ${idx + 1}:`, JSON.stringify(err, null, 2));
//             }
//           );
//         }
//       }

//       const errorMessage =
//         shipEngineError instanceof Error
//           ? shipEngineError.message
//           : "ShipEngine API request failed";
//       return NextResponse.json(
//         { error: `Label creation failed: ${errorMessage}` },
//         { status: 422 }
//       );
//     }

//     // Validate label response
//     if (!label || !label.tracking_number) {
//       return NextResponse.json(
//         { error: "Invalid response from ShipEngine - no tracking number" },
//         { status: 500 }
//       );
//     }

//     console.log("ShipEngine label response:", JSON.stringify(label, null, 2));

//     // ShipEngine returns a single label object with packages array inside
//     let labelPackages = label.packages || [];

//     // For single package shipments, create a package entry from the main label
//     if (labelPackages.length === 0 && label.tracking_number) {
//       labelPackages = [
//         {
//           package_id: label.label_id,
//           tracking_number: label.tracking_number,
//           label_download: label.label_download,
//           weight: { value: packages[0]?.weight || 1, unit: "pound" },
//           dimensions: {
//             length: packages[0]?.length || 10,
//             width: packages[0]?.width || 8,
//             height: packages[0]?.height || 6,
//             unit: "inch",
//           },
//         },
//       ];
//     }

//     // ✅ UPDATED: Use database transaction with back order detection
//     const result = await prisma.$transaction(async (tx) => {
//       // Create shipping packages
//       const shippingPackages = await Promise.all(
//         labelPackages.map((pkg: any, idx: number) => {
//           const originalPackage = packages[Math.min(idx, packages.length - 1)];

//           return tx.shippingPackage.create({
//             data: {
//               orderId: order.id,
//               carrierCode: carrierCode,
//               serviceCode: serviceCode,
//               packageCode: originalPackage?.packageCode || "package",
//               trackingNumber: pkg.tracking_number,
//               labelUrl: pkg.label_download?.pdf || pkg.label_download?.href,
//               cost: new Prisma.Decimal(label.shipment_cost?.amount || 0),
//               currency: label.shipment_cost?.currency || "USD",
//               weight: new Prisma.Decimal(
//                 pkg.weight?.value || originalPackage?.weight || 1
//               ),
//               dimensions: {
//                 length: pkg.dimensions?.length || originalPackage?.length || 10,
//                 width: pkg.dimensions?.width || originalPackage?.width || 8,
//                 height: pkg.dimensions?.height || originalPackage?.height || 6,
//                 unit: "inch",
//               },
//             },
//           });
//         })
//       );

//       // ✅ CHECK: Are we shipping a back order?
//       // ✅ CHECK: Are we shipping a back order?
//       const activeBackOrders = await tx.backOrder.findMany({
//         where: {
//           orderId: orderId,
//           status: {
//             in: ["ALLOCATED", "PICKING", "PICKED", "PACKED"],
//           },
//         },
//         include: {
//           productVariant: {
//             select: {
//               sku: true,
//             },
//           },
//         },
//       });

//       const isBackOrderShipment = activeBackOrders.length > 0;

//       console.log(
//         `📦 Shipment type: ${
//           isBackOrderShipment ? "BACK_ORDER" : "INITIAL_ORDER"
//         }`
//       );

//       if (isBackOrderShipment) {
//         console.log(
//           `📦 Found ${activeBackOrders.length} active back order(s):`
//         );
//         activeBackOrders.forEach((bo) => {
//           console.log(
//             `   - ${bo.productVariant?.sku}: ${bo.quantityBackOrdered} units (${bo.status})`
//           );
//         });
//       }

//       // ✅ Get ONLY the reservations for items we're shipping now
//       let reservationsToRelease;

//       if (isBackOrderShipment) {
//         // ✅ BACK ORDER: Only release reservations created for back orders
//         const backOrderProductIds = activeBackOrders.map(
//           (bo) => bo.productVariantId
//         );

//         reservationsToRelease = await tx.inventoryReservation.findMany({
//           where: {
//             orderId: orderId,
//             productVariantId: { in: backOrderProductIds },
//             status: "ACTIVE",
//           },
//         });

//         console.log(
//           `📦 Back order shipment: Found ${reservationsToRelease.length} reservations to release`
//         );
//         console.log(`   Products: ${backOrderProductIds.join(", ")}`);
//       } else {
//         // ✅ INITIAL ORDER: Release all active reservations
//         reservationsToRelease = await tx.inventoryReservation.findMany({
//           where: {
//             orderId: orderId,
//             status: "ACTIVE",
//           },
//         });

//         console.log(
//           `📦 Initial order shipment: Found ${reservationsToRelease.length} reservations to release`
//         );
//       }

//       // ✅ Verify we found the right amount
//       const totalToRelease = reservationsToRelease.reduce(
//         (sum, r) => sum + r.quantity,
//         0
//       );
//       console.log(`📦 Total units to release: ${totalToRelease}`);

//       // ✅ Release inventory for ONLY the reservations we found (SINGLE LOOP)
//       for (const reservation of reservationsToRelease) {
//         console.log(
//           `   - Releasing ${reservation.quantity} units of product ${reservation.productVariantId} from location ${reservation.locationId}`
//         );

//         // Update inventory
//         await tx.inventory.update({
//           where: {
//             productVariantId_locationId: {
//               productVariantId: reservation.productVariantId,
//               locationId: reservation.locationId,
//             },
//           },
//           data: {
//             quantityReserved: { decrement: reservation.quantity },
//             quantityOnHand: { decrement: reservation.quantity },
//           },
//         });

//         // Create inventory transaction
//         await tx.inventoryTransaction.create({
//           data: {
//             productVariantId: reservation.productVariantId,
//             locationId: reservation.locationId,
//             transactionType: "SALE",
//             quantityChange: -reservation.quantity,
//             referenceId: orderId,
//             referenceType: "SHIPMENT_LABEL_CREATED",
//             userId: session.user.id,
//             notes: `Released ${reservation.quantity} units for order ${
//               order.orderNumber
//             } - Tracking: ${label.tracking_number}${
//               isBackOrderShipment ? " (Back Order)" : ""
//             }`,
//           },
//         });
//       }

//       // ✅ Mark ONLY these reservations as FULFILLED
//       await tx.inventoryReservation.updateMany({
//         where: {
//           id: { in: reservationsToRelease.map((r) => r.id) },
//           status: "ACTIVE",
//         },
//         data: {
//           status: "FULFILLED",
//         },
//       });

//       // ✅ Mark back orders as FULFILLED
//       if (isBackOrderShipment) {
//         for (const backOrder of activeBackOrders) {
//           await tx.backOrder.update({
//             where: { id: backOrder.id },
//             data: {
//               status: "FULFILLED",
//               fulfilledAt: new Date(),
//               quantityFulfilled: backOrder.quantityBackOrdered,
//             },
//           });
//         }
//         console.log(
//           `✅ Marked ${activeBackOrders.length} back order(s) as fulfilled`
//         );
//       }

//       // ✅ CHECK: Are there still pending back orders?
//       const pendingBackOrders = await tx.backOrder.findMany({
//         where: {
//           orderId: orderId,
//           status: {
//             in: ["PENDING", "ALLOCATED", "PICKING", "PICKED"], // Not yet shipped
//           },
//         },
//       });

//       const hasPendingBackOrders = pendingBackOrders.length > 0;

//       // Update order details
//       const updatedOrder = await tx.order.update({
//         where: { id: order.id },
//         data: {
//           trackingNumber: order.trackingNumber
//             ? `${order.trackingNumber}, ${label.tracking_number}`
//             : label.tracking_number,
//           trackingUrl: label.tracking_url || label.label_download?.pdf,
//           shippedAt: order.shippedAt || new Date(),
//           shippingStatus: hasPendingBackOrders
//             ? "PARTIALLY_SHIPPED"
//             : "SHIPPED",
//           shippingCost: order.shippingCost
//             ? (
//                 parseFloat(order.shippingCost) +
//                 (label.shipment_cost?.amount || 0)
//               ).toString()
//             : label.shipment_cost?.amount?.toString(),
//           shippingCarrier: order.shippingCarrier
//             ? `${order.shippingCarrier}, ${carrierCode}`
//             : carrierCode,
//           shippingService: order.shippingService
//             ? `${order.shippingService}, ${serviceCode}`
//             : serviceCode,
//           labelUrl: order.labelUrl
//             ? `${order.labelUrl}, ${
//                 label.label_download?.pdf || label.label_download?.href
//               }`
//             : label.label_download?.pdf || label.label_download?.href,
//           notes: `${order.notes || ""} ${
//             notes || `Shipped with ${labelPackages.length} package(s)`
//           }`.trim(),
//         },
//       });

//       // ✅ CRITICAL: Set correct status based on back orders
//       const newStatus = hasPendingBackOrders ? "PARTIALLY_SHIPPED" : "SHIPPED";
//       const statusNotes = hasPendingBackOrders
//         ? `Partially shipped via ${carrierCode.toUpperCase()} - ${
//             pendingBackOrders.length
//           } item(s) still on back order - Tracking: ${label.tracking_number}`
//         : `Shipped via ${carrierCode.toUpperCase()} - Tracking: ${
//             label.tracking_number
//           }`;

//       await updateOrderStatus({
//         orderId: order.id,
//         newStatus,
//         userId: session.user.id,
//         notes: statusNotes,
//         tx,
//       });

//       return {
//         shippingPackages,
//         updatedOrder,
//         hasPendingBackOrders,
//         reservationsReleased: reservationsToRelease.length,
//         totalUnitsReleased: totalToRelease,
//       };
//     });

//     return NextResponse.json({
//       success: true,
//       label: {
//         trackingNumber: label.tracking_number,
//         cost: label.shipment_cost?.amount,
//         labelUrl: label.label_download?.pdf || label.label_download?.href,
//         trackingUrl: label.tracking_url,
//       },
//       labels: labelPackages.map((pkg: any) => ({
//         trackingNumber: pkg.tracking_number,
//         cost: label.shipment_cost?.amount,
//         labelUrl: pkg.label_download?.pdf || pkg.label_download?.href,
//       })),
//       orderId: order.id,
//       orderNumber: order.orderNumber,
//       isTestLabel: process.env.SHIPENGINE_SANDBOX === "true",
//     });
//   } catch (error) {
//     console.error("Error creating ShipEngine label:", error);

//     if (error instanceof Prisma.PrismaClientKnownRequestError) {
//       return NextResponse.json(
//         { error: "Database error occurred while creating shipping label" },
//         { status: 500 }
//       );
//     }

//     const errorMessage =
//       error instanceof Error
//         ? error.message
//         : "Failed to create shipping label";

//     return NextResponse.json({ error: errorMessage }, { status: 500 });
//   }
// }
