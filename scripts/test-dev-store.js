const fetch = require("node-fetch");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require("dotenv").config({ path: ".env" });

async function testDevStoreIntegration() {
  console.log("🧪 Testing Shopify Dev Store Integration");
  console.log("=".repeat(50));

  try {
    // Test 1: Shopify API Connection
    console.log("📡 Test 1: Shopify API Connection");
    const shopResponse = await fetch(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
        },
      }
    );

    if (shopResponse.ok) {
      const shopData = await shopResponse.json();
      console.log("✅ Connected to Shopify store:", shopData.shop.name);
      console.log("🏪 Domain:", shopData.shop.domain);
    } else {
      console.error("❌ Shopify API connection failed");
      return;
    }

    // Test 2: Webhook Endpoint
    // Test 2: Webhook Endpoint (health)
    console.log("\n🔗 Test 2: Webhook Endpoint");
    const base = process.env.WEBHOOK_BASE_URL.replace(/\/+$/, "");
    const healthRes = await fetch(
      `${base}/api/webhooks/shopify/orders/create`,
      { method: "GET" }
    );

    if (healthRes.ok) {
      console.log("✅ Webhook endpoint reachable (GET)");
    } else {
      console.error(
        "❌ Webhook endpoint GET failed:",
        healthRes.status,
        await healthRes.text()
      );
      console.log("Check ngrok, dev server on :3000, and route path.");
      return;
    }

    // Test 3: Database Connection
    console.log("\n💾 Test 3: Database Connection");
    const productCount = await prisma.product.count();
    const locationCount = await prisma.location.count();
    const inventoryCount = await prisma.inventory.count();

    console.log("✅ Database connected");
    console.log(`📦 Products: ${productCount}`);
    console.log(`📍 Locations: ${locationCount}`);
    console.log(`📊 Inventory records: ${inventoryCount}`);

    if (productCount === 0) {
      console.log(
        "⚠️  No products found. Run: node scripts/sync-shopify-products.js"
      );
    }

    // Test 4: Product SKU Matching
    console.log("\n🏷️  Test 4: Product SKU Matching");
    const productsResponse = await fetch(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/products.json?limit=5`,
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
        },
      }
    );

    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      console.log(
        `📦 Found ${productsData.products.length} products in Shopify`
      );

      for (const product of productsData.products.slice(0, 3)) {
        for (const variant of product.variants) {
          if (variant.sku) {
            const wmsVariant = await prisma.productVariant.findUnique({
              where: { sku: variant.sku },
              include: { inventory: true },
            });

            if (wmsVariant) {
              const totalInventory = wmsVariant.inventory.reduce(
                (sum, inv) => sum + inv.quantityOnHand,
                0
              );
              console.log(`✅ ${variant.sku}: ${totalInventory} units in WMS`);
            } else {
              console.log(`❌ ${variant.sku}: Not found in WMS`);
            }
          }
        }
      }
    }

    console.log("\n🎯 Integration Status Summary:");
    console.log("✅ Shopify API: Connected");
    console.log("✅ Webhook URL: Accessible");
    console.log("✅ Database: Connected");
    console.log(`📦 Products synced: ${productCount > 0 ? "Yes" : "No"}`);

    if (productCount > 0) {
      console.log(
        "\n🛍️  Ready to test! Place an order in your Shopify dev store."
      );
    } else {
      console.log(
        "\n⚠️  Run product sync first: node scripts/sync-shopify-products.js"
      );
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDevStoreIntegration();
