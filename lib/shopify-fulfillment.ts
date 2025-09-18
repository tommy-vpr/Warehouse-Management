// lib/shopify-fulfillment.ts
type UpdateShopifyFulfillmentArgs = {
  orderId: string; // Shopify order id: GID or numeric
  trackingNumber: string;
  trackingCompany?: string;
  trackingUrl?: string;
  // Your local items: include variantId or sku to map to Shopify
  lineItems: Array<{
    variantId?: string; // your stored Shopify variant GID if available
    sku?: string; // fallback
    quantity: number;
  }>;
  notifyCustomer?: boolean;
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
    // throw new Error(`Shopify GraphQL error: ${res.status}\n${msg}`);
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
  } = args;

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
                    lineItem {
                      id
                      sku
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
          id: string; // FulfillmentOrderLineItem ID
          remainingQuantity: number;
          lineItem: {
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

  // 2) Build map of your items -> Shopify FO line items
  // Prefer variantId match, else SKU match
  const wanted = lineItems.filter((li) => li.quantity > 0);

  // check if foPlans is empty
  const foPlans: Array<{
    fulfillmentOrderId: string;
    fulfillmentOrderLineItems: Array<{ id: string; quantity: number }>;
  }> = [];

  for (const edge of order.fulfillmentOrders.edges) {
    const fo = edge.node;
    if (fo.status !== "OPEN") continue;

    const candidates = fo.lineItems.edges.map((e) => e.node);

    const picks: Array<{ id: string; quantity: number }> = [];

    for (const w of wanted) {
      let matched: (typeof candidates)[number] | undefined;

      if (w.variantId) {
        matched = candidates.find(
          (c) =>
            c.lineItem.variant?.id === w.variantId && c.remainingQuantity > 0
        );
      }
      if (!matched && w.sku) {
        matched = candidates.find(
          (c) =>
            (c.lineItem.variant?.sku === w.sku || c.lineItem.sku === w.sku) &&
            c.remainingQuantity > 0
        );
      }

      if (matched) {
        const qty = Math.min(w.quantity, matched.remainingQuantity);
        if (qty > 0) {
          picks.push({ id: matched.id, quantity: qty });
          // reduce local desired qty (support multi-FO splits)
          w.quantity -= qty;
        }
      }
    }

    if (picks.length) {
      foPlans.push({
        fulfillmentOrderId: fo.id,
        fulfillmentOrderLineItems: picks,
      });
    }
  }

  if (!foPlans.length) {
    throw new Error("No valid fulfillment orders found to fulfill");
  }

  const stillUnmapped = wanted.some((w) => w.quantity > 0);
  if (foPlans.length === 0 || stillUnmapped) {
    throw new Error(
      `Could not map all items to Fulfillment Order line items. Plans: ${JSON.stringify(
        foPlans
      )}, remaining: ${JSON.stringify(wanted)}`
    );
  }

  // 3) Create fulfillment(s)
  const CREATE = `
    mutation($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment { id status trackingInfo { number company url } totalQuantity }
        userErrors { field message }
      }
    }
  ` as const;

  const created: Array<{
    id: string;
    status: string;
    trackingInfo: Array<{
      number: string;
      company: string;
      url: string | null;
    }>;
    totalQuantity: number;
  }> = [];

  // You can create a single fulfillment with multiple FOs if they’re same location;
  // for safety, just iterate plans (Shopify accepts multiple FOs in one call when valid).
  const input = {
    lineItemsByFulfillmentOrder: foPlans,
    trackingInfo: {
      number: trackingNumber,
      company: trackingCompany,
      ...(trackingUrl ? { url: trackingUrl } : {}),
    },
    notifyCustomer,
  };

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

  created.push(payload.fulfillment);

  return {
    fulfillment: created[0],
  };
}
