interface ShopifyFulfillmentData {
  orderId: string;
  trackingNumber: string;
  trackingCompany: string;
  trackingUrl?: string;
  lineItems: Array<{
    id: string;
    quantity: number;
  }>;
  notifyCustomer?: boolean;
}

export async function updateShopifyFulfillment(data: ShopifyFulfillmentData) {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION;

  if (!SHOPIFY_DOMAIN || !ACCESS_TOKEN) {
    throw new Error("Shopify credentials not configured");
  }

  // GraphQL mutation to create fulfillment
  const mutation = `
    mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment {
          id
          status
          trackingInfo {
            number
            company
            url
          }
          createdAt
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const fulfillmentInput = {
    orderId: `gid://shopify/Order/${data.orderId}`,
    lineItems: data.lineItems.map((item) => ({
      id: `gid://shopify/LineItem/${item.id}`,
      quantity: item.quantity,
    })),
    trackingInfo: {
      number: data.trackingNumber,
      company: data.trackingCompany,
      url: data.trackingUrl,
    },
    notifyCustomer: data.notifyCustomer ?? true,
  };

  const response = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: { fulfillment: fulfillmentInput },
      }),
    }
  );

  const result = await response.json();

  if (result.errors || result.data?.fulfillmentCreate?.userErrors?.length > 0) {
    const errors = result.errors || result.data.fulfillmentCreate.userErrors;
    throw new Error(`Shopify fulfillment failed: ${JSON.stringify(errors)}`);
  }

  return result.data.fulfillmentCreate.fulfillment;
}
