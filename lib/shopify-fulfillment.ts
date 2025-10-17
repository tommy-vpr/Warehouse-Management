// lib/shopify-fulfillment.ts

type UpdateShopifyFulfillmentArgs = {
  orderId: string;
  trackingNumber: string;
  trackingCompany?: string;
  trackingUrl?: string;
  lineItems: Array<{
    variantId?: string;
    sku?: string;
    quantity: number;
  }>;
  notifyCustomer?: boolean;
  isBackOrder?: boolean;
};

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;
const API_VERSION = "2025-07";

function toOrderGID(id: string) {
  return id.startsWith("gid://shopify/Order/")
    ? id
    : `gid://shopify/Order/${id}`;
}

async function shopifyFetch<T>(query: string, variables: any): Promise<T> {
  const res = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  const json = await res.json();
  if (!res.ok || json.errors) {
    const msg = JSON.stringify(json.errors || json, null, 2);
    throw new Error(
      `Shopify GraphQL error (${res.status}):\n${msg}\nQuery: ${query.slice(
        0,
        200
      )}`
    );
  }
  return json;
}

export async function updateShopifyFulfillment(
  args: UpdateShopifyFulfillmentArgs
) {
  const {
    orderId,
    trackingNumber,
    trackingCompany = "Other",
    trackingUrl,
    lineItems,
    notifyCustomer = true,
    isBackOrder = false,
  } = args;

  console.log(`📦 Creating Shopify fulfillment for order ${orderId}`);
  console.log(`📦 Type: ${isBackOrder ? "BACK ORDER" : "INITIAL"} shipment`);
  console.log(`📦 Items to fulfill:`, JSON.stringify(lineItems, null, 2));

  const orderGid = toOrderGID(orderId);

  // 1) Fetch Fulfillment Orders + FO line items
  const GET_FOS = `
    query($orderId: ID!) {
      order(id: $orderId) {
        id
        fulfillmentOrders(first: 20) {
          edges {
            node {
              id
              status
              lineItems(first: 100) {
                edges {
                  node {
                    id
                    remainingQuantity
                    totalQuantity
                    lineItem {
                      id
                      sku
                      title
                      variant { id sku }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ` as const;

  type FoNode = {
    id: string;
    status: string;
    lineItems: {
      edges: Array<{
        node: {
          id: string;
          remainingQuantity: number;
          totalQuantity: number;
          lineItem: {
            id: string;
            title: string;
            sku: string | null;
            variant: { id: string; sku: string | null } | null;
          };
        };
      }>;
    };
  };

  const data = await shopifyFetch<{
    data: {
      order: {
        id: string;
        fulfillmentOrders: { edges: Array<{ node: FoNode }> };
      } | null;
    };
  }>(GET_FOS, { orderId: orderGid });

  const order = data.data.order;
  if (!order) throw new Error("Order not found in Shopify");

  console.log(`\n📦 Shopify Fulfillment Orders:`);
  order.fulfillmentOrders.edges.forEach((edge, idx) => {
    console.log(`\n  FO ${idx + 1}: ${edge.node.id}`);
    console.log(`  Status: ${edge.node.status}`);
    console.log(`  Line Items:`);
    edge.node.lineItems.edges.forEach((li) => {
      console.log(
        `    - ${li.node.lineItem.title} (SKU: ${li.node.lineItem.sku})`
      );
      console.log(
        `      Total: ${li.node.totalQuantity}, Remaining: ${li.node.remainingQuantity}`
      );
      console.log(`      FO Line Item ID: ${li.node.id}`);
    });
  });

  // 2) Build map of your items -> Shopify FO line items
  const wanted = lineItems.filter((li) => li.quantity > 0);
  console.log(
    `\n📦 Items we want to fulfill (${wanted.length}):`,
    JSON.stringify(wanted, null, 2)
  );

  const foPlans: Array<{
    fulfillmentOrderId: string;
    fulfillmentOrderLineItems: Array<{ id: string; quantity: number }>;
  }> = [];

  for (const edge of order.fulfillmentOrders.edges) {
    const fo = edge.node;
    console.log(
      `\n📦 Processing Fulfillment Order: ${fo.id} (Status: ${fo.status})`
    );

    // ✅ Accept OPEN or IN_PROGRESS statuses
    if (!["OPEN", "IN_PROGRESS"].includes(fo.status)) {
      console.log(`  ⚠️  Skipping - status is ${fo.status}`);
      continue;
    }

    const candidates = fo.lineItems.edges.map((e) => e.node);
    console.log(`  Found ${candidates.length} line item(s) in this FO`);

    const picks: Array<{ id: string; quantity: number }> = [];

    for (const w of wanted) {
      console.log(`\n  📦 Looking for: ${w.sku} x${w.quantity}`);
      let matched: (typeof candidates)[number] | undefined;

      if (w.variantId) {
        console.log(`    Searching by variantId: ${w.variantId}`);
        matched = candidates.find(
          (c) =>
            c.lineItem.variant?.id === w.variantId && c.remainingQuantity > 0
        );
        if (matched) {
          console.log(`    ✅ Matched by variantId`);
          console.log(`       Remaining: ${matched.remainingQuantity}`);
        }
      }

      if (!matched && w.sku) {
        console.log(`    Searching by SKU: ${w.sku}`);
        matched = candidates.find(
          (c) =>
            (c.lineItem.variant?.sku === w.sku || c.lineItem.sku === w.sku) &&
            c.remainingQuantity > 0
        );
        if (matched) {
          console.log(`    ✅ Matched by SKU`);
          console.log(`       Remaining: ${matched.remainingQuantity}`);
        }
      }

      if (matched) {
        const qty = Math.min(w.quantity, matched.remainingQuantity);
        console.log(
          `    📦 Will fulfill ${qty} units (requested: ${w.quantity}, available: ${matched.remainingQuantity})`
        );

        if (qty > 0) {
          picks.push({ id: matched.id, quantity: qty });
          w.quantity -= qty;
          console.log(`    ✅ Added to picks. Remaining needed: ${w.quantity}`);
        } else {
          console.log(`    ⚠️  Quantity is 0, skipping`);
        }
      } else {
        console.log(`    ❌ No match found for ${w.sku}`);
      }
    }

    if (picks.length) {
      console.log(
        `\n  ✅ Adding ${picks.length} item(s) to fulfillment plan for FO ${fo.id}`
      );
      foPlans.push({
        fulfillmentOrderId: fo.id,
        fulfillmentOrderLineItems: picks,
      });
    } else {
      console.log(`\n  ⚠️  No items picked for this FO`);
    }
  }

  console.log(`\n📦 Final fulfillment plans: ${foPlans.length}`);
  console.log(JSON.stringify(foPlans, null, 2));

  if (!foPlans.length) {
    console.error(`❌ ERROR: No valid fulfillment orders found to fulfill`);
    console.error(`Wanted items:`, JSON.stringify(wanted, null, 2));
    throw new Error("No valid fulfillment orders found to fulfill");
  }

  const stillUnmapped = wanted.some((w) => w.quantity > 0);
  if (stillUnmapped) {
    console.error(`❌ ERROR: Could not map all items`);
    console.error(
      `Unmapped items:`,
      JSON.stringify(
        wanted.filter((w) => w.quantity > 0),
        null,
        2
      )
    );
    throw new Error(
      `Could not map all items to Fulfillment Order line items. Plans: ${JSON.stringify(
        foPlans
      )}, remaining: ${JSON.stringify(wanted)}`
    );
  }

  console.log(`✅ Mapped ${foPlans.length} fulfillment order(s)`);

  // 3) Create fulfillment
  const CREATE = `
    mutation($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment {
          id
          status
          trackingInfo {
            number
            company
            url
          }
          totalQuantity
        }
        userErrors { field message }
      }
    }
  ` as const;

  const input = {
    lineItemsByFulfillmentOrder: foPlans,
    trackingInfo: {
      number: trackingNumber,
      company: trackingCompany,
      ...(trackingUrl ? { url: trackingUrl } : {}),
    },
    notifyCustomer,
  };

  console.log(
    `📤 Sending fulfillment to Shopify:`,
    JSON.stringify(input, null, 2)
  );

  const res = await shopifyFetch<{
    data: {
      fulfillmentCreate: {
        fulfillment: {
          id: string;
          status: string;
          trackingInfo: Array<{
            number: string;
            company: string;
            url: string | null;
          }>;
          totalQuantity: number;
        } | null;
        userErrors: Array<{ field: string[] | null; message: string }>;
      };
    };
  }>(CREATE, { fulfillment: input });

  const payload = res.data.fulfillmentCreate;
  if (payload.userErrors?.length) {
    throw new Error(
      `Shopify userErrors: ${JSON.stringify(payload.userErrors)}`
    );
  }
  if (!payload.fulfillment) {
    throw new Error("Shopify returned no fulfillment object");
  }

  console.log(`✅ Shopify fulfillment created: ${payload.fulfillment.id}`);
  console.log(`✅ Status: ${payload.fulfillment.status}`);
  console.log(`✅ Total quantity: ${payload.fulfillment.totalQuantity}`);

  return {
    fulfillment: payload.fulfillment,
    fulfillmentId: payload.fulfillment.id,
    status: payload.fulfillment.status,
    trackingNumber: payload.fulfillment.trackingInfo[0]?.number,
  };
}

export function getShopifyCarrierName(carrierCode: string): string {
  const carrierMap: Record<string, string> = {
    ups: "UPS",
    stamps_com: "USPS",
    usps: "USPS",
    fedex: "FedEx",
    dhl_express: "DHL Express",
    dhl: "DHL",
  };

  return carrierMap[carrierCode.toLowerCase()] || carrierCode.toUpperCase();
}
