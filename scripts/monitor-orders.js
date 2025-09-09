const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function monitorOrders() {
  console.log("👀 Order Monitor - Press Ctrl+C to stop");
  console.log("Checking for new orders every 5 seconds...\n");

  let lastOrderCount = 0;

  setInterval(async () => {
    try {
      const orders = await prisma.order.findMany({
        include: {
          items: {
            include: {
              productVariant: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      if (orders.length !== lastOrderCount) {
        console.clear();
        console.log("👀 Order Monitor - Latest Orders:");
        console.log("=".repeat(60));

        orders.forEach((order, index) => {
          console.log(
            `${index + 1}. ${order.orderNumber} - ${order.customerName}`
          );
          console.log(
            `   Status: ${order.status} | Total: $${order.totalAmount}`
          );
          console.log(
            `   Items: ${
              order.items.length
            } | Created: ${order.createdAt.toLocaleString()}`
          );

          if (order.shopifyOrderId) {
            console.log(`   🛍️  Shopify Order: ${order.shopifyOrderId}`);
          }
          console.log("");
        });

        lastOrderCount = orders.length;
        console.log(`Total orders: ${orders.length}`);
        console.log("Checking for updates...");
      }
    } catch (error) {
      console.error("Monitor error:", error.message);
    }
  }, 5000);
}

monitorOrders();
