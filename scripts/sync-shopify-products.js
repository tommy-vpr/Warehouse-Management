const fetch = require("node-fetch");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require("dotenv").config({ path: ".env" });

async function syncShopifyProducts() {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!SHOPIFY_DOMAIN || !ACCESS_TOKEN) {
    console.error("❌ Missing Shopify credentials in .env.local");
    console.log("Required: SHOPIFY_STORE_DOMAIN, SHOPIFY_ACCESS_TOKEN");
    return;
  }

  console.log("🔄 Syncing products from Shopify to WMS...");
  console.log("🏪 Store:", SHOPIFY_DOMAIN);

  try {
    // Fetch products from Shopify
    const response = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2023-10/products.json?limit=50`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Shopify API error:", error);
      return;
    }

    const data = await response.json();
    console.log(`📦 Found ${data.products.length} products in Shopify`);

    // Create default location if none exists
    let location = await prisma.location.findFirst();
    if (!location) {
      location = await prisma.location.create({
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
    }

    let syncedProducts = 0;
    let syncedVariants = 0;

    for (const shopifyProduct of data.products) {
      console.log(`\n📋 Processing: ${shopifyProduct.title}`);

      // Create or update product
      let product = await prisma.product.findUnique({
        where: { shopifyProductId: shopifyProduct.id.toString() },
      });

      if (!product) {
        // Use first variant SKU as product SKU if available
        const mainSku =
          shopifyProduct.variants[0]?.sku || `SHOPIFY-${shopifyProduct.id}`;

        product = await prisma.product.create({
          data: {
            sku: mainSku,
            name: shopifyProduct.title,
            description: shopifyProduct.body_html || shopifyProduct.description,
            shopifyProductId: shopifyProduct.id.toString(),
          },
        });
        console.log(`   ✅ Created product: ${product.sku}`);
        syncedProducts++;
      } else {
        console.log(`   ⚠️  Product already exists: ${product.sku}`);
      }

      // Process variants
      for (const shopifyVariant of shopifyProduct.variants) {
        if (!shopifyVariant.sku) {
          console.log(
            `   ⚠️  Skipping variant without SKU: ${shopifyVariant.title}`
          );
          continue;
        }

        let variant = await prisma.productVariant.findUnique({
          where: { sku: shopifyVariant.sku },
        });

        if (!variant) {
          variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: shopifyVariant.sku,
              upc: shopifyVariant.barcode || null,
              name: shopifyVariant.title || shopifyProduct.title,
              costPrice: null, // You'll need to add this manually
              sellingPrice: parseFloat(shopifyVariant.price),
              weight: shopifyVariant.weight
                ? parseFloat(shopifyVariant.weight)
                : null,
              shopifyVariantId: shopifyVariant.id.toString(),
            },
          });
          console.log(
            `   ✅ Created variant: ${variant.sku} - $${variant.sellingPrice}`
          );
          syncedVariants++;

          // Create initial inventory (you can adjust quantities)
          const initialQuantity = 100; // Default inventory
          await prisma.inventory.create({
            data: {
              productVariantId: variant.id,
              locationId: location.id,
              quantityOnHand: initialQuantity,
              quantityReserved: 0,
              reorderPoint: 10,
            },
          });
          console.log(`   📦 Added ${initialQuantity} units to inventory`);
        } else {
          console.log(`   ⚠️  Variant already exists: ${variant.sku}`);
        }
      }
    }

    console.log("\n🎉 Sync completed!");
    console.log(`📦 Products synced: ${syncedProducts}`);
    console.log(`🏷️  Variants synced: ${syncedVariants}`);
    console.log("\n📋 Next steps:");
    console.log("1. Adjust inventory quantities if needed");
    console.log("2. Set up webhook: node scripts/setup-webhook.js");
    console.log("3. Place test order in your Shopify store");
  } catch (error) {
    console.error("❌ Error syncing products:", error);
  } finally {
    await prisma.$disconnect();
  }
}

syncShopifyProducts();
