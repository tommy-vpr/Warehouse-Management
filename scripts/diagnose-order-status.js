// scripts/diagnose-order-status.js
const fetch = require("node-fetch");
require("dotenv").config({ path: ".env" });

async function diagnoseOrder() {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  const testOrderId = "6337570898083"; // Order #1032

  console.log("Diagnosing Order for Fulfillment");
  console.log("=================================");
  console.log("Order ID:", testOrderId);
  console.log("");

  try {
    // Get detailed order information
    const orderResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2023-10/orders/${testOrderId}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    if (!orderResponse.ok) {
      console.log("Failed to fetch order:", orderResponse.status);
      return;
    }

    const orderData = await orderResponse.json();
    const order = orderData.order;

    console.log("ORDER DETAILS:");
    console.log("Name:", order.name);
    console.log("Email:", order.email);
    console.log("Financial Status:", order.financial_status);
    console.log("Fulfillment Status:", order.fulfillment_status);
    console.log("Created:", order.created_at);
    console.log("Total Price:", order.total_price);
    console.log("");

    console.log("LINE ITEMS:");
    order.line_items.forEach((item, i) => {
      console.log(`${i + 1}. ${item.title}`);
      console.log(`   SKU: ${item.sku}`);
      console.log(`   Quantity: ${item.quantity}`);
      console.log(`   Fulfillable Quantity: ${item.fulfillable_quantity}`);
      console.log(`   Fulfilled Quantity: ${item.fulfilled_quantity}`);
      console.log("");
    });

    console.log("EXISTING FULFILLMENTS:");
    if (order.fulfillments && order.fulfillments.length > 0) {
      order.fulfillments.forEach((fulfillment, i) => {
        console.log(`${i + 1}. ID: ${fulfillment.id}`);
        console.log(`   Status: ${fulfillment.status}`);
        console.log(`   Tracking: ${fulfillment.tracking_number || "None"}`);
        console.log(`   Company: ${fulfillment.tracking_company || "None"}`);
        console.log(`   Created: ${fulfillment.created_at}`);
        console.log("");
      });
    } else {
      console.log("No existing fulfillments");
      console.log("");
    }

    // Check if order can be fulfilled
    const totalFulfillable = order.line_items.reduce(
      (sum, item) => sum + item.fulfillable_quantity,
      0
    );

    console.log("FULFILLMENT ANALYSIS:");
    console.log("Total fulfillable quantity:", totalFulfillable);
    console.log(
      "Financial status OK:",
      order.financial_status === "paid" ? "Yes" : "No"
    );
    console.log(
      "Can fulfill:",
      totalFulfillable > 0 && order.financial_status === "paid" ? "YES" : "NO"
    );
    console.log("");

    // If we can fulfill, try with minimal data
    if (totalFulfillable > 0 && order.financial_status === "paid") {
      console.log("ATTEMPTING MINIMAL FULFILLMENT:");

      const minimalFulfillment = {
        fulfillment: {
          notify_customer: false, // Don't spam during testing
        },
      };

      const fulfillResponse = await fetch(
        `https://${SHOPIFY_DOMAIN}/admin/api/2023-10/orders/${testOrderId}/fulfillments.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": ACCESS_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(minimalFulfillment),
        }
      );

      console.log("Minimal fulfillment status:", fulfillResponse.status);
      const responseText = await fulfillResponse.text();

      if (fulfillResponse.ok) {
        const result = JSON.parse(responseText);
        console.log("SUCCESS! Minimal fulfillment created:");
        console.log("ID:", result.fulfillment.id);
        console.log("Status:", result.fulfillment.status);
      } else {
        console.log("Failed. Response:", responseText);

        // Try to parse the error
        try {
          const errorData = JSON.parse(responseText);
          console.log("Parsed error:", JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log("Could not parse error response");
        }
      }
    } else {
      console.log("ORDER CANNOT BE FULFILLED:");
      if (totalFulfillable === 0) console.log("- No fulfillable items");
      if (order.financial_status !== "paid")
        console.log("- Payment not completed");
    }
  } catch (error) {
    console.error("Diagnosis failed:", error.message);
  }
}

diagnoseOrder();
