// app/dashboard/orders/[id]/page.tsx
import OrderDetailView from "@/components/order/OrderDetailView";
import { cookies, headers } from "next/headers";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ✅ await headers() because it returns a Promise in Next.js 15+
  const headersList = await headers();
  const host = headersList.get("host");

  // ✅ same for cookies() if you’re using Next.js 15+
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(`${baseUrl}/api/orders/${id}`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader, // ✅ forward cookies for authenticated API call
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch order ${id}: ${res.status}`);
  }

  const order = await res.json();

  return <OrderDetailView orderId={id} initialData={order} />;
}
