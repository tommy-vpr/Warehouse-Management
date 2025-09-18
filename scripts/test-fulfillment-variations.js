// scripts/test-fulfillment-variations.js
const fetch = require("node-fetch");
require("dotenv").config({ path: ".env" });

async function testFulfillmentVariations() {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  const testOrderId = "6337570898083";

  console.log("Testing Different Fulfillment Approaches");
  console.log("========================================");

  // Test 1: Try different API versions
  const apiVersions = ["2024-01", "2023-10", "2023-07", "2023-04"];

  for (const version of apiVersions) {
    console.log(`\nTesting API version: ${version}`);

    try {
      const fulfillmentData = {
        fulfillment: {
          notify_customer: false,
        },
      };

      const response = await fetch(
        `https://${SHOPIFY_DOMAIN}/admin/api/${version}/orders/${testOrderId}/fulfillments.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": ACCESS_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fulfillmentData),
        }
      );

      console.log(`API ${version} status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        console.log(`SUCCESS with API ${version}!`);
        console.log("Fulfillment ID:", result.fulfillment.id);
        console.log("Status:", result.fulfillment.status);
        return; // Stop here if we found a working version
      } else {
        const errorText = await response.text();
        if (errorText) {
          console.log(`Error: ${errorText.substring(0, 200)}`);
        } else {
          console.log("Empty error response");
        }
      }
    } catch (error) {
      console.log(`API ${version} failed:`, error.message);
    }
  }

  // Test 2: Try with location_id (sometimes required)
  console.log("\n--- Testing with location_id ---");

  try {
    // First, get available locations
    const locationsResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/locations.json`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    if (locationsResponse.ok) {
      const locationsData = await locationsResponse.json();
      const primaryLocation = locationsData.locations[0];

      console.log(
        "Found location:",
        primaryLocation.name,
        "ID:",
        primaryLocation.id
      );

      const fulfillmentWithLocation = {
        fulfillment: {
          location_id: primaryLocation.id,
          notify_customer: false,
        },
      };

      const fulfillResponse = await fetch(
        `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders/${testOrderId}/fulfillments.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": ACCESS_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fulfillmentWithLocation),
        }
      );

      console.log("With location status:", fulfillResponse.status);

      if (fulfillResponse.ok) {
        const result = await fulfillResponse.json();
        console.log("SUCCESS with location!");
        console.log("Fulfillment ID:", result.fulfillment.id);
        return;
      } else {
        const errorText = await fulfillResponse.text();
        console.log("Location error:", errorText);
      }
    }
  } catch (error) {
    console.log("Location test failed:", error.message);
  }

  // Test 3: Try with explicit line items
  console.log("\n--- Testing with explicit line items ---");

  try {
    // Get order line items first
    const orderResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders/${testOrderId}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    if (orderResponse.ok) {
      const orderData = await orderResponse.json();
      const order = orderData.order;

      const lineItems = order.line_items
        .filter((item) => item.fulfillable_quantity > 0)
        .map((item) => ({
          id: item.id,
          quantity: item.fulfillable_quantity,
        }));

      console.log("Line items to fulfill:", lineItems.length);

      const fulfillmentWithItems = {
        fulfillment: {
          line_items: lineItems,
          notify_customer: false,
        },
      };

      const fulfillResponse = await fetch(
        `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders/${testOrderId}/fulfillments.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": ACCESS_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fulfillmentWithItems),
        }
      );

      console.log("With line items status:", fulfillResponse.status);

      if (fulfillResponse.ok) {
        const result = await fulfillResponse.json();
        console.log("SUCCESS with line items!");
        console.log("Fulfillment ID:", result.fulfillment.id);
        return;
      } else {
        const errorText = await fulfillResponse.text();
        console.log("Line items error:", errorText);
      }
    }
  } catch (error) {
    console.log("Line items test failed:", error.message);
  }

  // Test 4: Check fulfillment orders endpoint (newer approach)
  console.log("\n--- Testing fulfillment orders endpoint ---");

  try {
    const fulfillmentOrdersResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders/${testOrderId}/fulfillment_orders.json`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    console.log("Fulfillment orders status:", fulfillmentOrdersResponse.status);

    if (fulfillmentOrdersResponse.ok) {
      const data = await fulfillmentOrdersResponse.json();
      console.log("Fulfillment orders found:", data.fulfillment_orders.length);

      if (data.fulfillment_orders.length > 0) {
        const fulfillmentOrder = data.fulfillment_orders[0];
        console.log("Fulfillment order ID:", fulfillmentOrder.id);
        console.log("Status:", fulfillmentOrder.status);
        console.log("This might be the modern way to fulfill orders!");
      }
    }
  } catch (error) {
    console.log("Fulfillment orders test failed:", error.message);
  }

  console.log("\n=== All Tests Complete ===");
  console.log("If none worked, the issue might be:");
  console.log("1. API permissions (need 'write_orders' scope)");
  console.log("2. Order state (might need different status)");
  console.log("3. Modern fulfillment workflow required");
}

testFulfillmentVariations();
