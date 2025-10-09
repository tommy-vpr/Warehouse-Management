import { prisma } from "@/lib/prisma";
import { updateShopifyFulfillment } from "@/lib/shopify-fulfillment";

export async function fulfillOrderAndUpdateShopify(
  orderId: string,
  userId: string
) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
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

    if (order.status !== "SHIPPED") {
      throw new Error("Order must be shipped before marking as fulfilled");
    }

    // ✅ REMOVED: Status update - let the actions route handle it
    // This function now ONLY handles Shopify fulfillment
    // The calling code will update status with proper history tracking

    if (order.items.length > 0) {
      await tx.inventoryTransaction.create({
        data: {
          productVariantId: order.items[0].productVariantId,
          transactionType: "SALE",
          quantityChange: 0,
          referenceId: orderId,
          referenceType: "SHOPIFY_FULFILLMENT",
          userId,
          notes: `Order ${order.orderNumber} marked as fulfilled`,
        },
      });
    }

    return { order: order }; // Return original order, not updated one
  });

  if (result.order.shopifyOrderId) {
    try {
      const shopifyResult = await updateShopifyFulfillment({
        orderId: result.order.shopifyOrderId,
        trackingNumber: result.order.trackingNumber || "UNKNOWN",
        trackingCompany: "USPS",
        trackingUrl: result.order.trackingUrl || undefined,
        lineItems: result.order.items.map((item) => ({
          variantId: item.productVariant.shopifyVariantId || undefined,
          sku: item.productVariant.sku,
          quantity: item.quantity,
        })),
        notifyCustomer: true,
      });

      console.log("✅ Shopify fulfillment created:", shopifyResult.fulfillment);
    } catch (shopifyError) {
      console.error("Shopify fulfillment error:", shopifyError);

      await prisma.inventoryTransaction.create({
        data: {
          productVariantId: result.order.items[0]?.productVariantId || "",
          transactionType: "ADJUSTMENT",
          quantityChange: 0,
          referenceId: orderId,
          referenceType: "SHOPIFY_ERROR",
          userId,
          notes: `Shopify fulfillment failed: ${
            shopifyError instanceof Error
              ? shopifyError.message
              : "Unknown error"
          }`,
        },
      });
    }
  } else {
    console.log(
      `No Shopify order ID for order ${result.order.orderNumber} – skipping Shopify fulfillment`
    );
  }
}

// import { prisma } from "@/lib/prisma";
// import { updateShopifyFulfillment } from "@/lib/shopify-fulfillment";

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

//     const updatedOrder = await tx.order.update({
//       where: { id: orderId },
//       data: {
//         status: "FULFILLED",
//         updatedAt: new Date(),
//       },
//     });

//     if (order.items.length > 0) {
//       await tx.inventoryTransaction.create({
//         data: {
//           productVariantId: order.items[0].productVariantId,
//           transactionType: "SALE",
//           quantityChange: 0,
//           referenceId: orderId,
//           referenceType: "SHOPIFY_FULFILLMENT",
//           userId,
//           notes: `Order ${order.orderNumber} marked as fulfilled`,
//         },
//       });
//     }

//     return { order: updatedOrder, originalOrder: order };
//   });

//   if (result.originalOrder.shopifyOrderId) {
//     try {
//       const shopifyResult = await updateShopifyFulfillment({
//         orderId: result.originalOrder.shopifyOrderId,
//         trackingNumber: result.originalOrder.trackingNumber || "UNKNOWN",
//         trackingCompany: "USPS",
//         trackingUrl: result.originalOrder.trackingUrl || undefined,
//         lineItems: result.originalOrder.items.map((item) => ({
//           variantId: item.productVariant.shopifyVariantId || undefined,
//           sku: item.productVariant.sku,
//           quantity: item.quantity,
//         })),
//         notifyCustomer: true,
//       });

//       console.log("✅ Shopify fulfillment created:", shopifyResult.fulfillment);
//     } catch (shopifyError) {
//       console.error("Shopify fulfillment error:", shopifyError);

//       await prisma.inventoryTransaction.create({
//         data: {
//           productVariantId:
//             result.originalOrder.items[0]?.productVariantId || "",
//           transactionType: "ADJUSTMENT",
//           quantityChange: 0,
//           referenceId: orderId,
//           referenceType: "SHOPIFY_ERROR",
//           userId,
//           notes: `Shopify fulfillment failed: ${
//             shopifyError instanceof Error
//               ? shopifyError.message
//               : "Unknown error"
//           }`,
//         },
//       });
//     }
//   } else {
//     console.log(
//       `No Shopify order ID for order ${result.originalOrder.orderNumber} – skipping Shopify fulfillment`
//     );
//   }
// }
