const fetch = require("node-fetch");
require("dotenv").config({ path: ".env" });

async function setupWebhook() {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL;

  console.log("🔗 Setting up Shopify webhook...");
  console.log("🏪 Store:", SHOPIFY_DOMAIN);
  console.log("🌐 Webhook URL:", WEBHOOK_BASE_URL);

  if (!SHOPIFY_DOMAIN || !ACCESS_TOKEN || !WEBHOOK_BASE_URL) {
    console.error("❌ Missing required environment variables:");
    console.log("SHOPIFY_STORE_DOMAIN:", !!SHOPIFY_DOMAIN);
    console.log("SHOPIFY_ACCESS_TOKEN:", !!ACCESS_TOKEN);
    console.log("WEBHOOK_BASE_URL:", !!WEBHOOK_BASE_URL);
    console.log("\nMake sure ngrok is running: ngrok http 3000");
    return;
  }

  try {
    // Check existing webhooks first
    console.log("🔍 Checking existing webhooks...");
    const listResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2023-10/webhooks.json`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    if (listResponse.ok) {
      const existingWebhooks = await listResponse.json();
      const orderWebhooks = existingWebhooks.webhooks.filter(
        (w) => w.topic === "orders/create"
      );

      if (orderWebhooks.length > 0) {
        console.log("⚠️  Found existing order webhooks:");
        orderWebhooks.forEach((webhook) => {
          console.log(`   📋 ID: ${webhook.id}`);
          console.log(`   🔗 URL: ${webhook.address}`);
          console.log(`   📅 Created: ${webhook.created_at}`);
        });

        const proceed = true; // Set to false if you want to manually choose
        if (!proceed) {
          console.log(
            "ℹ️  Skipping webhook creation. Delete existing webhooks first if needed."
          );
          return;
        }
      }
    }

    // Create new webhook
    const webhookUrl = `${WEBHOOK_BASE_URL}/api/webhooks/shopify/orders/create`;

    const webhook = {
      webhook: {
        topic: "orders/create",
        address: webhookUrl,
        format: "json",
      },
    };

    console.log("📤 Creating webhook...");
    const response = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2023-10/webhooks.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhook),
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Webhook created successfully!");
      console.log("📋 Webhook ID:", result.webhook.id);
      console.log("🔗 Webhook URL:", result.webhook.address);
      console.log("📅 Created:", result.webhook.created_at);

      console.log("\n🧪 Test your webhook:");
      console.log("1. Place an order in your Shopify dev store");
      console.log("2. Watch your terminal for webhook logs");
      console.log("3. Check database with: npx prisma studio");

      console.log("\n💡 Webhook is ready! Your integration is live.");
    } else {
      console.error("❌ Failed to create webhook:", result);

      if (result.errors) {
        console.log("📋 Error details:");
        Object.entries(result.errors).forEach(([field, errors]) => {
          console.log(`   ${field}: ${errors.join(", ")}`);
        });
      }
    }
  } catch (error) {
    console.error("❌ Error setting up webhook:", error.message);
  }
}

setupWebhook();
