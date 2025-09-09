const { PrismaClient } = require("@prisma/client");
require("dotenv").config({ path: ".env.local" });

async function testDatabase() {
  console.log("🔍 Testing database connection...");
  console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
  console.log("DIRECT_URL exists:", !!process.env.DIRECT_URL);

  const prisma = new PrismaClient();

  try {
    // Test basic connection
    await prisma.$connect();
    console.log("✅ Database connection successful");

    // Test if tables exist
    const userCount = await prisma.user.count();
    console.log("✅ Tables exist - User count:", userCount);

    const locationCount = await prisma.location.count();
    console.log("✅ Location table accessible - Count:", locationCount);

    console.log("🎉 Database is ready!");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);

    if (error.message.includes("Tenant or user not found")) {
      console.log("\n💡 This usually means:");
      console.log("1. Wrong database URL");
      console.log("2. Database password expired");
      console.log("3. Project was paused/deleted");
      console.log(
        "\n🔧 Fix: Get new connection string from Supabase dashboard"
      );
    }

    if (error.message.includes("does not exist")) {
      console.log("\n💡 Tables not created yet. Run:");
      console.log("npx prisma db push");
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
