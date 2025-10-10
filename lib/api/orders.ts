import { OrderDetailResponse } from "@/types/order";

export interface OrderActionRequest {
  action: string;
  orderId: string;
}

export interface OrderActionResponse {
  success: boolean;
  message?: string;
  order?: OrderDetailResponse;
}

export async function fetchOrderDetail(
  orderId: string
): Promise<OrderDetailResponse> {
  const res = await fetch(`/api/orders/${orderId}`);
  if (!res.ok) throw new Error(`Failed to fetch order: ${res.status}`);
  return res.json();
}

export async function performOrderAction(
  request: OrderActionRequest
): Promise<OrderActionResponse> {
  const res = await fetch("/api/orders/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Failed to perform action: ${res.status}`);
  }

  return data;
}
