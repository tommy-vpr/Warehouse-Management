const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearSpecificData() {
  console.log("🎯 Clearing specific test data...");

  const options = {
    clearOrders: true, // Clear orders and order items
    clearInventory: true, // Clear inventory and transactions
    clearProducts: true, // Clear products and variants
    clearLocations: false, // Keep locations (you might want to keep these)
    clearAuth: false, // Keep user accounts and sessions
  };

  try {
    if (options.clearOrders) {
      // Clear orders (this will cascade to order items)
      const orderCount = await prisma.order.deleteMany({
        where: {
          // Only delete test orders (adjust criteria as needed)
          OR: [
            { orderNumber: { contains: "TEST" } },
            { customerEmail: { contains: "@example.com" } },
          ],
        },
      });
      console.log(`✅ Cleared ${orderCount.count} test orders`);
    }

    if (options.clearInventory) {
      // Clear inventory transactions
      const transactionCount = await prisma.inventoryTransaction.deleteMany({});
      console.log(
        `✅ Cleared ${transactionCount.count} inventory transactions`
      );

      // Reset all inventory to zero
      const inventoryUpdate = await prisma.inventory.updateMany({
        data: {
          quantityOnHand: 0,
          quantityReserved: 0,
        },
      });
      console.log(
        `✅ Reset ${inventoryUpdate.count} inventory records to zero`
      );
    }

    if (options.clearProducts) {
      // Clear products (this will cascade to variants and inventory)
      const productCount = await prisma.product.deleteMany({
        where: {
          // Only delete test products
          OR: [{ sku: { contains: "TEST" } }, { name: { contains: "Test" } }],
        },
      });
      console.log(`✅ Cleared ${productCount.count} test products`);
    }

    if (options.clearLocations) {
      const locationCount = await prisma.location.deleteMany({});
      console.log(`✅ Cleared ${locationCount.count} locations`);
    }

    if (options.clearAuth) {
      const sessionCount = await prisma.session.deleteMany({});
      const accountCount = await prisma.account.deleteMany({});
      console.log(
        `✅ Cleared ${sessionCount.count} sessions and ${accountCount.count} accounts`
      );
    }

    console.log("\n🎉 Specific data cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing specific data:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearSpecificData();
