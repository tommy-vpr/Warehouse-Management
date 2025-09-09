const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearAllDataAdvanced() {
  console.log("🧹 Advanced: Clearing ALL data including users...");
  console.log("⚠️  THIS WILL DELETE EVERYTHING - INCLUDING YOUR LOGIN!");

  try {
    // Use raw SQL to disable foreign key checks (PostgreSQL)
    await prisma.$executeRaw`SET session_replication_role = replica;`;

    console.log("🔓 Disabled foreign key constraints");

    // Get all table names
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `;

    console.log(`🗂️  Found ${tables.length} tables to clear`);

    // Clear each table
    for (const table of tables) {
      const tableName = table.tablename;
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`
      );
      console.log(`✅ Cleared table: ${tableName}`);
    }

    // Re-enable foreign key checks
    await prisma.$executeRaw`SET session_replication_role = DEFAULT;`;
    console.log("🔒 Re-enabled foreign key constraints");

    console.log("\n🎉 ALL data cleared successfully!");
    console.log("📋 Database is completely empty");
    console.log("\n⚠️  You will need to:");
    console.log("1. Run: npx prisma db push (to recreate schema)");
    console.log("2. Create a new user account to login");
    console.log("3. Run: node scripts/sync-shopify-products.js");
  } catch (error) {
    console.error("❌ Error in advanced clear:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllDataAdvanced();
