const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function resetToFresh() {
  console.log("🔄 Resetting database to fresh state...");

  try {
    // Clear all business data but keep auth
    console.log("🧹 Clearing business data...");

    await prisma.inventoryTransaction.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.inventory.deleteMany({});
    await prisma.productVariant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.location.deleteMany({});

    console.log("✅ Cleared all business data");

    // Create default location
    const location = await prisma.location.create({
      data: {
        name: "MAIN-A1",
        zone: "A",
        aisle: "1",
        shelf: "A",
        bin: "1",
        isPickable: true,
        isReceivable: true,
      },
    });
    console.log("✅ Created default location:", location.name);

    console.log("\n🎉 Database reset to fresh state!");
    console.log("📋 Ready for:");
    console.log("1. node scripts/sync-shopify-products.js");
    console.log("2. node scripts/setup-webhook.js");
    console.log("3. Test orders from Shopify");
  } catch (error) {
    console.error("❌ Error resetting database:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetToFresh();
