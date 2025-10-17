// scripts/reset-inventory-to-zero.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function resetInventoryToZero() {
  console.log("🔄 Resetting inventory to zero...");
  console.log("⚠️  This will:");
  console.log("   ✅ Keep: Products, Variants, Locations, Users");
  console.log("   🗑️  Delete: All orders, transactions, and operational data");
  console.log("   0️⃣  Reset: All inventory quantities to 0");
  console.log("");

  // Wait for confirmation
  await new Promise((resolve) => {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question("Continue? (yes/no): ", (answer) => {
      readline.close();
      if (answer.toLowerCase() !== "yes") {
        console.log("❌ Cancelled");
        process.exit(0);
      }
      resolve();
    });
  });

  try {
    console.log("\n🗑️  Deleting operational data...\n");

    // ==============================================
    // 1. PICKING SYSTEM
    // ==============================================
    console.log("📦 Clearing picking system...");
    const pickEventCount = await prisma.pickEvent.deleteMany({});
    console.log(`   ✅ Deleted ${pickEventCount.count} pick events`);

    const pickListItemCount = await prisma.pickListItem.deleteMany({});
    console.log(`   ✅ Deleted ${pickListItemCount.count} pick list items`);

    const pickListCount = await prisma.pickList.deleteMany({});
    console.log(`   ✅ Deleted ${pickListCount.count} pick lists`);

    // ==============================================
    // 2. CYCLE COUNTING
    // ==============================================
    console.log("\n📊 Clearing cycle counting...");
    const cycleCountEventCount = await prisma.cycleCountEvent.deleteMany({});
    console.log(
      `   ✅ Deleted ${cycleCountEventCount.count} cycle count events`
    );

    const cycleCountTaskCount = await prisma.cycleCountTask.deleteMany({});
    console.log(`   ✅ Deleted ${cycleCountTaskCount.count} cycle count tasks`);

    const cycleCountCampaignCount = await prisma.cycleCountCampaign.deleteMany(
      {}
    );
    console.log(
      `   ✅ Deleted ${cycleCountCampaignCount.count} cycle count campaigns`
    );

    // ==============================================
    // 3. SHIPPING & ORDERS
    // ==============================================
    console.log("\n🚚 Clearing orders and shipping...");
    const shippingPackageCount = await prisma.shippingPackage.deleteMany({});
    console.log(
      `   ✅ Deleted ${shippingPackageCount.count} shipping packages`
    );

    const backOrderCount = await prisma.backOrder.deleteMany({});
    console.log(`   ✅ Deleted ${backOrderCount.count} back orders`);

    const shopifySyncCount = await prisma.shopifySync.deleteMany({});
    console.log(`   ✅ Deleted ${shopifySyncCount.count} Shopify syncs`);

    const reservationCount = await prisma.inventoryReservation.deleteMany({});
    console.log(
      `   ✅ Deleted ${reservationCount.count} inventory reservations`
    );

    const orderStatusHistoryCount = await prisma.orderStatusHistory.deleteMany(
      {}
    );
    console.log(
      `   ✅ Deleted ${orderStatusHistoryCount.count} order status history`
    );

    const orderItemCount = await prisma.orderItem.deleteMany({});
    console.log(`   ✅ Deleted ${orderItemCount.count} order items`);

    const orderCount = await prisma.order.deleteMany({});
    console.log(`   ✅ Deleted ${orderCount.count} orders`);

    // ==============================================
    // 4. PURCHASE ORDERS
    // ==============================================
    console.log("\n🛒 Clearing purchase orders...");
    const purchaseOrderItemCount = await prisma.purchaseOrderItem.deleteMany(
      {}
    );
    console.log(`   ✅ Deleted ${purchaseOrderItemCount.count} PO items`);

    const purchaseOrderCount = await prisma.purchaseOrder.deleteMany({});
    console.log(`   ✅ Deleted ${purchaseOrderCount.count} purchase orders`);

    // ==============================================
    // 5. INVENTORY PLANNER SYNC DATA
    // ==============================================
    console.log("\n📈 Clearing Inventory Planner sync data...");
    const ipPOLineCount = await prisma.inventoryPlannerPOLine.deleteMany({});
    console.log(`   ✅ Deleted ${ipPOLineCount.count} IP PO lines`);

    const ipPOCount = await prisma.inventoryPlannerPurchaseOrder.deleteMany({});
    console.log(`   ✅ Deleted ${ipPOCount.count} IP purchase orders`);

    const forecastCount = await prisma.forecastSuggestion.deleteMany({});
    console.log(`   ✅ Deleted ${forecastCount.count} forecast suggestions`);

    const syncProgressCount = await prisma.syncProgress.deleteMany({});
    console.log(
      `   ✅ Deleted ${syncProgressCount.count} sync progress records`
    );

    const syncLogCount = await prisma.syncLog.deleteMany({});
    console.log(`   ✅ Deleted ${syncLogCount.count} sync logs`);

    // ==============================================
    // 6. INVENTORY TRANSACTIONS
    // ==============================================
    console.log("\n📊 Clearing inventory transactions...");
    const transactionCount = await prisma.inventoryTransaction.deleteMany({});
    console.log(
      `   ✅ Deleted ${transactionCount.count} inventory transactions`
    );

    // ==============================================
    // 7. RESET INVENTORY TO ZERO
    // ==============================================
    console.log("\n0️⃣  Resetting all inventory quantities to zero...");
    const inventoryResetCount = await prisma.inventory.updateMany({
      data: {
        quantityOnHand: 0,
        quantityReserved: 0,
        casesOnHand: 0,
        casesReserved: 0,
        lastCounted: null,
      },
    });
    console.log(
      `   ✅ Reset ${inventoryResetCount.count} inventory records to 0`
    );

    // ==============================================
    // 8. NOTIFICATIONS
    // ==============================================
    console.log("\n🔔 Clearing notifications...");
    const notificationCount = await prisma.notification.deleteMany({});
    console.log(`   ✅ Deleted ${notificationCount.count} notifications`);

    // ==============================================
    // PRESERVED DATA
    // ==============================================
    console.log("\n✅ PRESERVED DATA:");

    const productCount = await prisma.product.count();
    console.log(`   📦 Products: ${productCount}`);

    const variantCount = await prisma.productVariant.count();
    console.log(`   🏷️  Product Variants: ${variantCount}`);

    const locationCount = await prisma.location.count();
    console.log(`   📍 Locations: ${locationCount}`);

    const userCount = await prisma.user.count();
    console.log(`   👤 Users: ${userCount}`);

    const inventoryCount = await prisma.inventory.count();
    console.log(`   📊 Inventory Records: ${inventoryCount} (all set to 0)`);

    // ==============================================
    // SUMMARY
    // ==============================================
    console.log("\n" + "=".repeat(60));
    console.log("🎉 RESET COMPLETE!");
    console.log("=".repeat(60));
    console.log("✅ Kept:");
    console.log(`   • ${productCount} Products`);
    console.log(`   • ${variantCount} Product Variants`);
    console.log(`   • ${locationCount} Locations`);
    console.log(`   • ${userCount} Users`);
    console.log(`   • ${inventoryCount} Inventory records (reset to 0)`);
    console.log("");
    console.log("🗑️  Deleted:");
    console.log(`   • ${pickEventCount.count} Pick Events`);
    console.log(`   • ${pickListItemCount.count} Pick List Items`);
    console.log(`   • ${pickListCount.count} Pick Lists`);
    console.log(`   • ${cycleCountEventCount.count} Cycle Count Events`);
    console.log(`   • ${cycleCountTaskCount.count} Cycle Count Tasks`);
    console.log(`   • ${cycleCountCampaignCount.count} Cycle Count Campaigns`);
    console.log(`   • ${orderCount.count} Orders`);
    console.log(`   • ${purchaseOrderCount.count} Purchase Orders`);
    console.log(`   • ${transactionCount.count} Inventory Transactions`);
    console.log(`   • ${notificationCount.count} Notifications`);
    console.log("");
    console.log("🚀 Ready to sync inventory from Inventory Planner!");
    console.log("   Run: node scripts/sync-inventory-from-ip.js");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\n🔍 Full error:");
    console.error(error);

    if (error.message.includes("Foreign key constraint")) {
      console.log("\n💡 Foreign key constraint error.");
      console.log(
        "   Some data might have dependencies that need to be deleted first."
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
resetInventoryToZero()
  .then(() => {
    console.log("\n✨ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });
