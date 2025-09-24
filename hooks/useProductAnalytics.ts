// hooks/useProductAnalytics.ts
import { useQuery } from "@tanstack/react-query";
import { ProductAnalytics } from "@/lib/analytics/product-analytics";

async function fetchProductAnalytics(
  variantId: string
): Promise<ProductAnalytics> {
  const response = await fetch(`/api/analytics/product/${variantId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch product analytics");
  }

  return response.json();
}

export function useProductAnalytics(variantId: string) {
  return useQuery({
    queryKey: ["product-analytics", variantId],
    queryFn: () => fetchProductAnalytics(variantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!variantId, // Only run if variantId exists
  });
}
