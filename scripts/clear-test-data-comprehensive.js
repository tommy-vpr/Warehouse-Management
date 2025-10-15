const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearTestData() {
  console.log("🧹 Clearing all test data from database...");
  console.log("⚠️  This will delete ALL data except users - are you sure?");

  try {
    console.log("🗑️  Deleting data in correct order...");

    // Delete in reverse order of dependencies to avoid foreign key constraints

    // ==============================================
    // 1. PICKING SYSTEM (most dependent)
    // ==============================================
    console.log("\n📦 Clearing picking system data...");

    const pickEventCount = await prisma.pickEvent.deleteMany({});
    console.log(`✅ Deleted ${pickEventCount.count} pick events`);

    const pickListItemCount = await prisma.pickListItem.deleteMany({});
    console.log(`✅ Deleted ${pickListItemCount.count} pick list items`);

    const pickListCount = await prisma.pickList.deleteMany({});
    console.log(`✅ Deleted ${pickListCount.count} pick lists`);

    // ==============================================
    // 2. CYCLE COUNTING SYSTEM
    // ==============================================
    console.log("\n📊 Clearing cycle counting data...");

    const cycleCountEventCount = await prisma.cycleCountEvent.deleteMany({});
    console.log(`✅ Deleted ${cycleCountEventCount.count} cycle count events`);

    const cycleCountTaskCount = await prisma.cycleCountTask.deleteMany({});
    console.log(`✅ Deleted ${cycleCountTaskCount.count} cycle count tasks`);

    const cycleCountCampaignCount = await prisma.cycleCountCampaign.deleteMany(
      {}
    );
    console.log(
      `✅ Deleted ${cycleCountCampaignCount.count} cycle count campaigns`
    );

    // ==============================================
    // 3. SHIPPING & BACK ORDERS
    // ==============================================
    console.log("\n🚚 Clearing shipping and back order data...");

    const shippingPackageCount = await prisma.shippingPackage.deleteMany({});
    console.log(`✅ Deleted ${shippingPackageCount.count} shipping packages`);

    const backOrderCount = await prisma.backOrder.deleteMany({});
    console.log(`✅ Deleted ${backOrderCount.count} back orders`);

    // ==============================================
    // 4. ORDERS
    // ==============================================
    console.log("\n📋 Clearing order data...");

    const orderStatusHistoryCount = await prisma.orderStatusHistory.deleteMany(
      {}
    );
    console.log(
      `✅ Deleted ${orderStatusHistoryCount.count} order status history records`
    );

    const orderItemCount = await prisma.orderItem.deleteMany({});
    console.log(`✅ Deleted ${orderItemCount.count} order items`);

    const orderCount = await prisma.order.deleteMany({});
    console.log(`✅ Deleted ${orderCount.count} orders`);

    // ==============================================
    // 5. PURCHASE ORDERS
    // ==============================================
    console.log("\n🛒 Clearing purchase order data...");

    const purchaseOrderItemCount = await prisma.purchaseOrderItem.deleteMany(
      {}
    );
    console.log(
      `✅ Deleted ${purchaseOrderItemCount.count} purchase order items`
    );

    const purchaseOrderCount = await prisma.purchaseOrder.deleteMany({});
    console.log(`✅ Deleted ${purchaseOrderCount.count} purchase orders`);

    // ==============================================
    // 6. INVENTORY PLANNER DATA
    // ==============================================
    console.log("\n📈 Clearing Inventory Planner sync data...");

    const inventoryPlannerPOLineCount =
      await prisma.inventoryPlannerPOLine.deleteMany({});
    console.log(`✅ Deleted ${inventoryPlannerPOLineCount.count} IP PO lines`);

    const inventoryPlannerPOCount =
      await prisma.inventoryPlannerPurchaseOrder.deleteMany({});
    console.log(
      `✅ Deleted ${inventoryPlannerPOCount.count} IP purchase orders`
    );

    const forecastSuggestionCount = await prisma.forecastSuggestion.deleteMany(
      {}
    );
    console.log(
      `✅ Deleted ${forecastSuggestionCount.count} forecast suggestions`
    );

    const syncProgressCount = await prisma.syncProgress.deleteMany({});
    console.log(`✅ Deleted ${syncProgressCount.count} sync progress records`);

    const syncLogCount = await prisma.syncLog.deleteMany({});
    console.log(`✅ Deleted ${syncLogCount.count} sync logs`);

    // ==============================================
    // 7. INVENTORY TRANSACTIONS
    // ==============================================
    console.log("\n📊 Clearing inventory transactions...");

    const transactionCount = await prisma.inventoryTransaction.deleteMany({});
    console.log(`✅ Deleted ${transactionCount.count} inventory transactions`);

    // ==============================================
    // 8. INVENTORY (stock levels)
    // ==============================================
    console.log("\n📦 Clearing inventory records...");

    const inventoryCount = await prisma.inventory.deleteMany({});
    console.log(`✅ Deleted ${inventoryCount.count} inventory records`);

    // ==============================================
    // 9. PRODUCTS & VARIANTS
    // ==============================================
    console.log("\n🏷️  Clearing product data...");

    const variantCount = await prisma.productVariant.deleteMany({});
    console.log(`✅ Deleted ${variantCount.count} product variants`);

    const productCount = await prisma.product.deleteMany({});
    console.log(`✅ Deleted ${productCount.count} products`);

    // ==============================================
    // 10. LOCATIONS
    // ==============================================
    console.log("\n📍 Clearing location data...");

    const locationCount = await prisma.location.deleteMany({});
    console.log(`✅ Deleted ${locationCount.count} locations`);

    // ==============================================
    // 11. NOTIFICATIONS
    // ==============================================
    console.log("\n🔔 Clearing notifications...");

    const notificationCount = await prisma.notification.deleteMany({});
    console.log(`✅ Deleted ${notificationCount.count} notifications`);

    // ==============================================
    // 12. AUTH DATA (but keep users)
    // ==============================================
    console.log("\n🔐 Clearing auth sessions (keeping users)...");

    const sessionCount = await prisma.session.deleteMany({});
    console.log(`✅ Deleted ${sessionCount.count} sessions`);

    const accountCount = await prisma.account.deleteMany({});
    console.log(`✅ Deleted ${accountCount.count} accounts`);

    const userCredentialCount = await prisma.userCredential.deleteMany({});
    console.log(`✅ Deleted ${userCredentialCount.count} user credentials`);

    // ==============================================
    // Optional: Delete users (KEEP COMMENTED)
    // ==============================================
    // console.log("\n👤 Clearing users...")
    // const userCount = await prisma.user.deleteMany({})
    // console.log(`✅ Deleted ${userCount.count} users`)

    // ==============================================
    // SUMMARY
    // ==============================================
    console.log("\n" + "=".repeat(50));
    console.log("🎉 All test data cleared successfully!");
    console.log("=".repeat(50));
    console.log("📋 Database is now clean and ready for fresh data");
    console.log("👤 Users have been preserved");
    console.log(
      "🔐 Auth sessions have been cleared (users will need to log in again)"
    );
    console.log("\n📊 Deleted totals:");
    console.log(`   • Pick Events: ${pickEventCount.count}`);
    console.log(`   • Pick List Items: ${pickListItemCount.count}`);
    console.log(`   • Pick Lists: ${pickListCount.count}`);
    console.log(`   • Cycle Count Events: ${cycleCountEventCount.count}`);
    console.log(`   • Cycle Count Tasks: ${cycleCountTaskCount.count}`);
    console.log(`   • Cycle Count Campaigns: ${cycleCountCampaignCount.count}`);
    console.log(`   • Shipping Packages: ${shippingPackageCount.count}`);
    console.log(`   • Back Orders: ${backOrderCount.count}`);
    console.log(`   • Order Status History: ${orderStatusHistoryCount.count}`);
    console.log(`   • Order Items: ${orderItemCount.count}`);
    console.log(`   • Orders: ${orderCount.count}`);
    console.log(`   • Purchase Order Items: ${purchaseOrderItemCount.count}`);
    console.log(`   • Purchase Orders: ${purchaseOrderCount.count}`);
    console.log(`   • IP PO Lines: ${inventoryPlannerPOLineCount.count}`);
    console.log(`   • IP Purchase Orders: ${inventoryPlannerPOCount.count}`);
    console.log(`   • Forecast Suggestions: ${forecastSuggestionCount.count}`);
    console.log(`   • Sync Progress: ${syncProgressCount.count}`);
    console.log(`   • Sync Logs: ${syncLogCount.count}`);
    console.log(`   • Inventory Transactions: ${transactionCount.count}`);
    console.log(`   • Inventory Records: ${inventoryCount.count}`);
    console.log(`   • Product Variants: ${variantCount.count}`);
    console.log(`   • Products: ${productCount.count}`);
    console.log(`   • Locations: ${locationCount.count}`);
    console.log(`   • Notifications: ${notificationCount.count}`);
    console.log(`   • Sessions: ${sessionCount.count}`);
    console.log(`   • Accounts: ${accountCount.count}`);
    console.log(`   • User Credentials: ${userCredentialCount.count}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\n❌ Error clearing data:", error.message);
    console.error("\n🔍 Full error details:");
    console.error(error);

    if (error.message.includes("Foreign key constraint")) {
      console.log("\n💡 Foreign key constraint error detected.");
      console.log("This usually means the deletion order needs adjustment.");
      console.log("Check which table is causing issues and update the script.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
clearTestData()
  .then(() => {
    console.log("\n✨ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });
