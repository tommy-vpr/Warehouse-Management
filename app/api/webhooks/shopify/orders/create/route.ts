import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Verify webhook signature for security
function verifyShopifyWebhook(body: string, signature: string): boolean {
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET!;
  if (!webhookSecret) return true; // Skip verification if no secret set

  const hash = crypto
    .createHmac("sha256", webhookSecret)
    .update(body, "utf8")
    .digest("base64");

  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("X-Shopify-Hmac-Sha256");
    const isDevelopment = process.env.NODE_ENV === "development";

    console.log("📦 Shopify webhook received");
    console.log("🔧 Development mode:", isDevelopment);

    // In development, allow requests without signature for testing
    if (!isDevelopment && !signature) {
      console.error("❌ Missing webhook signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Verify signature only if we have a secret and signature
    if (signature && process.env.SHOPIFY_WEBHOOK_SECRET) {
      if (!verifyShopifyWebhook(body, signature)) {
        console.error("❌ Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
      console.log("✅ Webhook signature verified");
    } else {
      console.log("⚠️  Skipping signature verification (development mode)");
    }

    const orderData = JSON.parse(body);
    console.log(
      "📦 Processing order:",
      orderData.name || orderData.order_number
    );

    // Process the order
    const order = await processShopifyOrder(orderData);

    console.log("✅ Order processed successfully:", order.orderNumber);

    // Optionally auto-reserve inventory
    if (process.env.AUTO_RESERVE_ORDERS === "true") {
      try {
        await autoReserveOrder(order.id);
        console.log("🎯 Inventory auto-reserved for order:", order.orderNumber);
      } catch (error) {
        console.warn(
          "⚠️  Auto-reserve failed:",
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      message: `Order ${order.orderNumber} processed successfully`,
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function processShopifyOrder(shopifyOrder: any) {
  return await prisma.$transaction(async (tx) => {
    // Check if order already exists
    const existingOrder = await tx.order.findUnique({
      where: { shopifyOrderId: shopifyOrder.id.toString() },
    });

    if (existingOrder) {
      console.log("⚠️  Order already exists:", existingOrder.orderNumber);
      return existingOrder;
    }

    // Determine customer name
    let customerName = "Unknown Customer";
    if (shopifyOrder.shipping_address) {
      customerName = `${shopifyOrder.shipping_address.first_name || ""} ${
        shopifyOrder.shipping_address.last_name || ""
      }`.trim();
    } else if (shopifyOrder.customer) {
      customerName = `${shopifyOrder.customer.first_name || ""} ${
        shopifyOrder.customer.last_name || ""
      }`.trim();
    } else if (shopifyOrder.billing_address) {
      customerName = `${shopifyOrder.billing_address.first_name || ""} ${
        shopifyOrder.billing_address.last_name || ""
      }`.trim();
    }

    // Create the order
    const order = await tx.order.create({
      data: {
        shopifyOrderId: shopifyOrder.id.toString(),
        orderNumber: shopifyOrder.name || shopifyOrder.order_number,
        customerName,
        customerEmail: shopifyOrder.email,
        totalAmount: parseFloat(
          shopifyOrder.total_price || shopifyOrder.current_total_price || "0"
        ),
        shippingAddress: shopifyOrder.shipping_address || {},
        billingAddress: shopifyOrder.billing_address || {},
        status: "PENDING",
      },
    });

    console.log(`📋 Created order ${order.orderNumber}`);

    // Create order items
    const lineItems = shopifyOrder.line_items || [];
    let itemsCreated = 0;
    let itemsSkipped = 0;

    for (const lineItem of lineItems) {
      // Find product variant by SKU
      let productVariant = null;

      if (lineItem.sku) {
        productVariant = await tx.productVariant.findUnique({
          where: { sku: lineItem.sku },
        });
      }

      // If not found by SKU, try by Shopify variant ID
      if (!productVariant && lineItem.variant_id) {
        productVariant = await tx.productVariant.findUnique({
          where: { shopifyVariantId: lineItem.variant_id.toString() },
        });
      }

      if (!productVariant) {
        console.warn(
          `⚠️  Product variant not found for SKU: ${lineItem.sku} / Shopify ID: ${lineItem.variant_id}`
        );

        // Optionally create a placeholder product
        if (process.env.CREATE_MISSING_PRODUCTS === "true") {
          try {
            const product = await tx.product.create({
              data: {
                sku: lineItem.sku || `SHOPIFY-${lineItem.variant_id}`,
                name: lineItem.title || lineItem.name,
                shopifyProductId: lineItem.product_id?.toString(),
              },
            });

            productVariant = await tx.productVariant.create({
              data: {
                productId: product.id,
                sku: lineItem.sku || `SHOPIFY-${lineItem.variant_id}`,
                name: lineItem.variant_title || lineItem.title,
                shopifyVariantId: lineItem.variant_id?.toString(),
                sellingPrice: parseFloat(lineItem.price || "0"),
              },
            });

            console.log(`✨ Created missing product: ${productVariant.sku}`);
          } catch (createError) {
            console.error(
              `❌ Failed to create product for SKU ${lineItem.sku}:`,
              createError
            );
            itemsSkipped++;
            continue;
          }
        } else {
          itemsSkipped++;
          continue; // Skip this item
        }
      }

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productVariantId: productVariant.id,
          quantity: lineItem.quantity,
          unitPrice: parseFloat(lineItem.price || "0"),
          totalPrice: parseFloat(lineItem.price || "0") * lineItem.quantity,
        },
      });

      itemsCreated++;
    }

    console.log(
      `✅ Created order ${order.orderNumber} with ${itemsCreated}/${lineItems.length} items`
    );
    if (itemsSkipped > 0) {
      console.warn(`⚠️  Skipped ${itemsSkipped} items due to missing products`);
    }

    return order;
  });
}

async function autoReserveOrder(orderId: string) {
  const baseUrl = process.env.WEBHOOK_BASE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/orders/${orderId}/reserve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": process.env.WEBHOOK_SECRET!,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Auto-reserve failed");
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // (optional) reconstruct full URL behind proxies (ngrok/Vercel)
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const fullUrl = `${proto}://${host}${pathname}${search}`;

  return NextResponse.json({
    ok: true,
    path: pathname, // e.g. "/api/webhooks/shopify" or "/api/webhooks/shopify/orders/create"
    url: fullUrl, // e.g. "https://xxxx.ngrok-free.app/api/webhooks/shopify"
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
}
