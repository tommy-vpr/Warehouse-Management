// hooks/useProductTransactions.ts
import { useQuery } from "@tanstack/react-query";
import { ProductTransaction } from "@/lib/services/product-transactions";

async function fetchProductTransactions(
  variantId: string,
  limit: number = 10
): Promise<ProductTransaction[]> {
  const response = await fetch(
    `/api/products/${variantId}/transactions?limit=${limit}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch product transactions");
  }

  return response.json();
}

export function useProductTransactions(variantId: string, limit: number = 10) {
  return useQuery({
    queryKey: ["product-transactions", variantId, limit],
    queryFn: () => fetchProductTransactions(variantId, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!variantId,
  });
}
