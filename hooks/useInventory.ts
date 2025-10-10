import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  fetchInventoryList,
  performInventoryAction,
} from "@/lib/api/inventory";
import type {
  InventoryActionRequest,
  InventoryActionResponse,
  UseInventoryListOptions,
} from "@/types/inventory";

export function useInventoryList(
  filters: Record<string, any>,
  options?: UseInventoryListOptions
) {
  return useQuery({
    queryKey: ["inventory", filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      return fetchInventoryList(params);
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    initialData: options?.initialData, // ✅ now properly typed
  });
}

export function useInventoryAction() {
  const queryClient = useQueryClient();

  return useMutation<InventoryActionResponse, Error, InventoryActionRequest>({
    mutationFn: performInventoryAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
