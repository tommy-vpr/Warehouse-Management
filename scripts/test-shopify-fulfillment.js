// scripts/test-modern-fulfillment.js
const fetch = require("node-fetch");
require("dotenv").config({ path: ".env" });

async function testModernFulfillment() {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  // THIS NEEDS UPDATE FOR NEW CASES
  const testOrderId = "6961718362249";

  console.log("Testing Modern Shopify Fulfillment Workflow");
  console.log("==========================================");

  try {
    // Step 1: Use GraphQL to get fulfillment orders (modern approach)
    console.log("1. Getting fulfillment orders via GraphQL...");

    const fulfillmentOrdersQuery = `
  query getFulfillmentOrders($orderId: ID!) {
    order(id: $orderId) {
      id
      name
      fulfillmentOrders(first: 10) {
        edges {
          node {
            id
            status
            assignedLocation {
              location {
                id
                name
              }
            }
            lineItems(first: 50) {
              edges {
                node {
                  id
                  remainingQuantity
                  totalQuantity
                  variant {
                    id
                    sku
                    title
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

    const graphqlResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2025-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: fulfillmentOrdersQuery,
          variables: {
            orderId: `gid://shopify/Order/${testOrderId}`,
          },
        }),
      }
    );

    if (!graphqlResponse.ok) {
      console.error("GraphQL request failed:", graphqlResponse.status);
      return;
    }

    const graphqlResult = await graphqlResponse.json();

    if (graphqlResult.errors) {
      console.error("GraphQL errors:", graphqlResult.errors);
      return;
    }

    const order = graphqlResult.data.order;
    if (!order) {
      console.error("Order not found");
      return;
    }

    console.log("Order:", order.name);
    console.log(
      "Fulfillment orders found:",
      order.fulfillmentOrders.edges.length
    );

    if (order.fulfillmentOrders.edges.length === 0) {
      console.log("No fulfillment orders found. This suggests:");
      console.log("- Order might be already fulfilled");
      console.log("- Order might not be in fulfillable state");
      console.log("- Fulfillment orders not created yet");
      return;
    }

    // Step 2: Process each fulfillment order
    for (const edge of order.fulfillmentOrders.edges) {
      const fulfillmentOrder = edge.node;

      console.log(`\nFulfillment Order: ${fulfillmentOrder.id}`);
      console.log(`Status: ${fulfillmentOrder.status}`);
      console.log(
        `Location: ${fulfillmentOrder.assignedLocation?.location?.name}`
      );
      console.log(`Line items: ${fulfillmentOrder.lineItems.edges.length}`);

      // Show line items
      fulfillmentOrder.lineItems.edges.forEach((lineEdge, i) => {
        const lineItem = lineEdge.node;
        console.log(`  ${i + 1}. ${lineItem.variant.title}`);
        console.log(`     SKU: ${lineItem.variant.sku}`);
        console.log(
          `     Remaining: ${lineItem.remainingQuantity}/${lineItem.totalQuantity}`
        );
      });

      // Step 3: Create fulfillment via GraphQL
      if (fulfillmentOrder.status === "OPEN") {
        console.log(`\n2. Creating fulfillment for: ${fulfillmentOrder.id}`);

        const createFulfillmentMutation = `
  mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment {
        id
        status
        trackingInfo { number company url }
        totalQuantity
      }
      userErrors { field message }
    }
  }
`;

        // Prepare line items for fulfillment
        const foLineItems = fulfillmentOrder.lineItems.edges
          .filter((e) => e.node.remainingQuantity > 0)
          .map((e) => ({ id: e.node.id, quantity: e.node.remainingQuantity }));

        const fulfillmentInput = {
          // 👇 Modern shape: tie items to the specific Fulfillment Order
          lineItemsByFulfillmentOrder: [
            {
              fulfillmentOrderId: fulfillmentOrder.id,
              fulfillmentOrderLineItems: foLineItems,
            },
          ],
          trackingInfo: {
            number: "MODERN-TEST-123",
            company: "USPS",
            url: "https://tools.usps.com/go/TrackConfirmAction?tLabels=MODERN-TEST-123",
          },
          notifyCustomer: true,
        };

        console.log(
          "Creating fulfillment with",
          foLineItems.length,
          "line items..."
        );

        const createFulfillmentResponse = await fetch(
          `https://${SHOPIFY_DOMAIN}/admin/api/2025-07/graphql.json`,
          {
            method: "POST",
            headers: {
              "X-Shopify-Access-Token": ACCESS_TOKEN,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: createFulfillmentMutation,
              variables: { fulfillment: fulfillmentInput },
            }),
          }
        );

        if (!createFulfillmentResponse.ok) {
          console.error(
            "Create fulfillment request failed:",
            createFulfillmentResponse.status
          );
          const errorText = await createFulfillmentResponse.text();
          console.error("Error:", errorText);
          continue;
        }

        const createResult = await createFulfillmentResponse.json();

        if (createResult.errors) {
          console.error("GraphQL errors:", createResult.errors);
          continue;
        }

        const { fulfillment, userErrors } = createResult.data.fulfillmentCreate;

        if (userErrors && userErrors.length > 0) {
          console.error("User errors:", userErrors);
          continue;
        }

        if (fulfillment) {
          console.log("SUCCESS! Fulfillment created:");
          console.log("ID:", fulfillment.id);
          console.log("Status:", fulfillment.status);
          console.log("Tracking:", fulfillment.trackingInfo?.number);
          console.log("Company:", fulfillment.trackingInfo?.company);

          console.log(
            "\nCheck your Shopify admin - order should now be fulfilled!"
          );
          return;
        }
      } else {
        console.log(
          `Fulfillment order status is ${fulfillmentOrder.status}, cannot fulfill`
        );
      }
    }
  } catch (error) {
    console.error("Modern fulfillment test failed:", error.message);
  }
}

testModernFulfillment();
