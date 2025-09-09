// lib/shopify.ts
import { createAdminApiClient } from "@shopify/admin-api-client";

const client = createAdminApiClient({
  storeDomain: "vpr-collection.myshopify.com",
  apiVersion: process.env.SHOPIFY_API_VERSION!,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
});

export async function getShopifyOrders(since?: string) {
  const query = `
    query getOrders($first: Int!, $since: DateTime) {
      orders(first: $first, query: $since ? "created_at:>=${since}" : "") {
        edges {
          node {
            id
            name
            email
            createdAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            shippingAddress {
              firstName
              lastName
              address1
              address2
              city
              province
              country
              zip
            }
            lineItems(first: 50) {
              edges {
                node {
                  id
                  title
                  quantity
                  variant {
                    id
                    sku
                    barcode
                  }
                  originalUnitPriceSet {
                    shopMoney {
                      amount
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

  const response = await client.request(query, {
    variables: { first: 50, since },
  });

  return response.data;
}

export async function syncShopifyOrder(shopifyOrderId: string) {
  // Implementation for syncing individual orders
  // This will be called from webhook or manual sync
}
