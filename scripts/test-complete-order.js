const fetch = require("node-fetch");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testCompleteOrder() {
  console.log("🚀 Testing complete order fulfillment...");

  try {
    // Find an allocated order
    const order = await prisma.order.findFirst({
      where: { status: "ALLOCATED" },
      include: { items: true },
    });

    if (!order) {
      console.log("❌ No allocated orders found");
      console.log("💡 Make sure you have an order with ALLOCATED status");
      return;
    }

    console.log(`📦 Found order: ${order.orderNumber}`);
    console.log(`👤 Customer: ${order.customerName}`);

    // Complete the order
    const response = await fetch(
      `${process.env.WEBHOOK_BASE_URL}/api/orders/${order.id}/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceCode: "usps_ground_advantage",
          carrierCode: "usps",
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Order completed successfully!");
      console.log(`📋 Order Status: ${result.order.status}`);
      console.log(`📋 Tracking: ${result.label.trackingNumber}`);
      console.log(`💰 Shipping: $${result.label.cost}`);
      console.log(`📄 Label: ${result.label.labelUrl}`);
      console.log(`🛍️ Shopify: ${result.shopify ? "Updated" : "Not updated"}`);
      console.log("\n🎉 Complete end-to-end flow successful!");
    } else {
      console.log("❌ Order completion failed:", result.error);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteOrder();
