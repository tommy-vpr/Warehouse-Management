const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearTestData() {
  console.log("🧹 Clearing all test data from database...");
  console.log("⚠️  This will delete ALL data - are you sure?");

  // Safety check - uncomment to require confirmation
  // const readline = require('readline').createInterface({
  //   input: process.stdin,
  //   output: process.stdout
  // })

  // const answer = await new Promise(resolve => {
  //   readline.question('Type "yes" to confirm: ', resolve)
  // })
  // readline.close()

  // if (answer !== 'yes') {
  //   console.log('❌ Cancelled')
  //   return
  // }

  try {
    console.log("🗑️  Deleting data in correct order...");

    // Delete in reverse order of dependencies to avoid foreign key constraints

    // 1. Delete inventory transactions (references users, variants, locations)
    const transactionCount = await prisma.inventoryTransaction.deleteMany({});
    console.log(`✅ Deleted ${transactionCount.count} inventory transactions`);

    // 2. Delete order items (references orders, variants)
    const orderItemCount = await prisma.orderItem.deleteMany({});
    console.log(`✅ Deleted ${orderItemCount.count} order items`);

    // 3. Delete orders
    const orderCount = await prisma.order.deleteMany({});
    console.log(`✅ Deleted ${orderCount.count} orders`);

    // 4. Delete inventory (references variants, locations)
    const inventoryCount = await prisma.inventory.deleteMany({});
    console.log(`✅ Deleted ${inventoryCount.count} inventory records`);

    // 5. Delete product variants (references products)
    const variantCount = await prisma.productVariant.deleteMany({});
    console.log(`✅ Deleted ${variantCount.count} product variants`);

    // 6. Delete products
    const productCount = await prisma.product.deleteMany({});
    console.log(`✅ Deleted ${productCount.count} products`);

    // 7. Delete locations
    const locationCount = await prisma.location.deleteMany({});
    console.log(`✅ Deleted ${locationCount.count} locations`);

    // 8. Delete auth sessions and accounts (but keep users for login)
    const sessionCount = await prisma.session.deleteMany({});
    console.log(`✅ Deleted ${sessionCount.count} sessions`);

    const accountCount = await prisma.account.deleteMany({});
    console.log(`✅ Deleted ${accountCount.count} accounts`);

    // Optional: Delete users (uncomment if you want to clear everything)
    // const userCount = await prisma.user.deleteMany({})
    // console.log(`✅ Deleted ${userCount.count} users`)

    console.log("\n🎉 All test data cleared successfully!");
    console.log("📋 Database is now clean and ready for fresh data");
  } catch (error) {
    console.error("❌ Error clearing data:", error.message);

    if (error.message.includes("Foreign key constraint")) {
      console.log("\n💡 Foreign key constraint error.");
      console.log("Try running the advanced clear script instead.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

clearTestData();
