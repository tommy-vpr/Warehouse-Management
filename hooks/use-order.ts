"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrderDetail,
  performOrderAction,
  OrderActionRequest,
} from "@/lib/api/orders";
import { OrderDetailResponse } from "@/types/order";
import { toast } from "@/hooks/use-toast";

export const useOrderDetail = (
  orderId: string,
  initialData?: OrderDetailResponse
) =>
  useQuery<OrderDetailResponse>({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrderDetail(orderId),
    enabled: !!orderId,
    initialData, // <-- use SSR data if present
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

export const useOrderAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: OrderActionRequest) => performOrderAction(req),
    onSuccess: (_, variables) => {
      // refresh that specific order query
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Order action failed";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};
