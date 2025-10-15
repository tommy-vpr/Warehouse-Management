// lib/fulfillOrderAndUpdateShopify.ts

import { prisma } from "@/lib/prisma";

export async function fulfillOrderAndUpdateShopify(
  orderId: string,
  userId: string
) {
  // Get order details
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          productVariant: {
            select: { sku: true, name: true, shopifyVariantId: true },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // ✅ Support both SHIPPED and PARTIALLY_SHIPPED
  if (order.status !== "SHIPPED" && order.status !== "PARTIALLY_SHIPPED") {
    throw new Error("Order must be shipped before marking as fulfilled");
  }

  // ✅ Check if already synced to Shopify during shipping
  if (order.shopifyOrderId && order.shopifyFulfillmentIds) {
    console.log(
      `✅ Order ${order.orderNumber} already synced to Shopify during shipping (Fulfillment IDs: ${order.shopifyFulfillmentIds})`
    );

    return {
      success: true,
      order,
      shopifyFulfillment: null,
      message:
        "Order marked as fulfilled. Shopify was already updated during shipping.",
    };
  }

  // ✅ If no Shopify fulfillment IDs, it means:
  // 1. Not a Shopify order, OR
  // 2. Shopify sync failed during shipping (check ShopifySync table)
  if (order.shopifyOrderId && !order.shopifyFulfillmentIds) {
    console.warn(
      `⚠️  Order ${order.orderNumber} is from Shopify but has no fulfillment IDs. Check ShopifySync table for errors.`
    );

    // Check if there's a pending sync task
    const pendingSync = await prisma.shopifySync.findFirst({
      where: {
        orderId: order.id,
        syncType: "FULFILLMENT",
        status: "PENDING",
      },
    });

    if (pendingSync) {
      return {
        success: false,
        order,
        error: new Error(
          `Shopify sync is pending retry. Last error: ${pendingSync.error}`
        ),
        message:
          "Shopify fulfillment failed during shipping and is pending retry. Please check ShopifySync table or retry manually.",
      };
    }
  }

  console.log(
    `ℹ️  Order ${order.orderNumber} marked as fulfilled${
      !order.shopifyOrderId ? " (not a Shopify order)" : ""
    }`
  );

  return {
    success: true,
    order,
    shopifyFulfillment: null,
    message: order.shopifyOrderId
      ? "Order marked as fulfilled. Note: No Shopify fulfillment found - may need manual sync."
      : "Order marked as fulfilled (not a Shopify order).",
  };
}
//-----------------------------------------------
// VERISON 2
//-----------------------------------------------
// import { prisma } from "@/lib/prisma";
// import { updateShopifyFulfillment } from "@/lib/shopify-fulfillment";

// export async function fulfillOrderAndUpdateShopify(
//   orderId: string,
//   userId: string
// ) {
//   // Get order details (no transaction needed - just reading data)
//   const order = await prisma.order.findUnique({
//     where: { id: orderId },
//     include: {
//       items: {
//         include: {
//           productVariant: {
//             select: { sku: true, name: true, shopifyVariantId: true },
//           },
//         },
//       },
//     },
//   });

//   if (!order) {
//     throw new Error("Order not found");
//   }

//   // ✅ Support both SHIPPED and PARTIALLY_SHIPPED
//   if (order.status !== "SHIPPED" && order.status !== "PARTIALLY_SHIPPED") {
//     throw new Error("Order must be shipped before marking as fulfilled");
//   }

//   // ✅ REMOVED: No inventory transaction - this is just a Shopify API sync
//   // Inventory was already decremented when shipping label was created

//   // Sync to Shopify
//   if (order.shopifyOrderId) {
//     try {
//       const shopifyResult = await updateShopifyFulfillment({
//         orderId: order.shopifyOrderId,
//         trackingNumber: order.trackingNumber || "UNKNOWN",
//         trackingCompany: order.shippingCarrier || "USPS", // ✅ Use actual carrier
//         trackingUrl: order.trackingUrl || undefined,
//         lineItems: order.items.map((item) => ({
//           variantId: item.productVariant.shopifyVariantId || undefined,
//           sku: item.productVariant.sku,
//           quantity: item.quantity,
//         })),
//         notifyCustomer: true,
//       });

//       console.log("✅ Shopify fulfillment created:", shopifyResult.fulfillment);
//       return { success: true, order, shopifyFulfillment: shopifyResult };
//     } catch (shopifyError) {
//       console.error("❌ Shopify fulfillment error:", shopifyError);

//       // ✅ Log error to order notes
//       await prisma.order.update({
//         where: { id: orderId },
//         data: {
//           notes: `${order.notes || ""}\n[ERROR] Shopify sync failed: ${
//             shopifyError instanceof Error
//               ? shopifyError.message
//               : "Unknown error"
//           }`.trim(),
//         },
//       });

//       // Don't throw - order is still fulfilled locally
//       return { success: false, order, error: shopifyError };
//     }
//   } else {
//     console.log(
//       `ℹ️  No Shopify order ID for order ${order.orderNumber} – skipping Shopify fulfillment`
//     );
//     return { success: true, order, shopifyFulfillment: null };
//   }
// }
//-----------------------------------------------
// VERISON 1
//-----------------------------------------------
// import { prisma } from "@/lib/prisma";
// import { updateShopifyFulfillment } from "@/lib/shopify-fulfillment";

// // lib/fulfillOrderAndUpdateShopify.ts (or wherever this function is)
// export async function fulfillOrderAndUpdateShopify(
//   orderId: string,
//   userId: string
// ) {
//   const result = await prisma.$transaction(async (tx) => {
//     const order = await tx.order.findUnique({
//       where: { id: orderId },
//       include: {
//         items: {
//           include: {
//             productVariant: {
//               select: { sku: true, name: true, shopifyVariantId: true },
//             },
//           },
//         },
//       },
//     });

//     if (!order) {
//       throw new Error("Order not found");
//     }

//     if (order.status !== "SHIPPED") {
//       throw new Error("Order must be shipped before marking as fulfilled");
//     }

//     // ✅ FIXED: Only log the sync, don't deduct inventory
//     // Inventory was already deducted when shipping label was created
//     if (order.items.length > 0) {
//       // Just create a log entry for the Shopify sync
//       await tx.inventoryTransaction.create({
//         data: {
//           productVariantId: order.items[0].productVariantId,
//           transactionType: "ADJUSTMENT", // ✅ Changed from SALE to ADJUSTMENT
//           quantityChange: 0, // ✅ No quantity change - just logging
//           referenceId: orderId,
//           referenceType: "SHOPIFY_FULFILLMENT",
//           userId,
//           notes: `Shopify fulfillment synced for order ${order.orderNumber}`,
//         },
//       });
//     }

//     return { order: order };
//   });

//   // ... rest of Shopify sync code ...
//   if (result.order.shopifyOrderId) {
//     try {
//       const shopifyResult = await updateShopifyFulfillment({
//         orderId: result.order.shopifyOrderId,
//         trackingNumber: result.order.trackingNumber || "UNKNOWN",
//         trackingCompany: "USPS",
//         trackingUrl: result.order.trackingUrl || undefined,
//         lineItems: result.order.items.map((item) => ({
//           variantId: item.productVariant.shopifyVariantId || undefined,
//           sku: item.productVariant.sku,
//           quantity: item.quantity,
//         })),
//         notifyCustomer: true,
//       });

//       console.log("✅ Shopify fulfillment created:", shopifyResult.fulfillment);
//     } catch (shopifyError) {
//       console.error("Shopify fulfillment error:", shopifyError);

//       // ✅ Log error to order notes instead of inventory transaction
//       await prisma.order.update({
//         where: { id: orderId },
//         data: {
//           notes: `${result.order.notes || ""}\n[ERROR] Shopify sync failed: ${
//             shopifyError instanceof Error
//               ? shopifyError.message
//               : "Unknown error"
//           }`.trim(),
//         },
//       });

//       // await prisma.inventoryTransaction.create({
//       //   data: {
//       //     productVariantId: result.order.items[0]?.productVariantId || "",
//       //     transactionType: "ADJUSTMENT",
//       //     quantityChange: 0,
//       //     referenceId: orderId,
//       //     referenceType: "SHOPIFY_ERROR",
//       //     userId,
//       //     notes: `Shopify fulfillment failed: ${
//       //       shopifyError instanceof Error
//       //         ? shopifyError.message
//       //         : "Unknown error"
//       //     }`,
//       //   },
//       // });
//     }
//   } else {
//     console.log(
//       `No Shopify order ID for order ${result.order.orderNumber} – skipping Shopify fulfillment`
//     );
//   }
// }
