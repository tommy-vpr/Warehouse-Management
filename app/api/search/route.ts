import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Search products
    const products = await prisma.productVariant.findMany({
      where: {
        OR: [
          { sku: { contains: query, mode: "insensitive" } },
          { upc: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { product: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: {
        product: { select: { name: true } },
        inventory: {
          select: { quantityOnHand: true },
        },
      },
      take: 5,
    });

    // Search orders
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: query, mode: "insensitive" } },
          { customerName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        status: true,
      },
      take: 3,
    });

    const results = [
      ...products.map((p) => ({
        id: p.id,
        type: "product",
        title: p.product.name,
        subtitle: `SKU: ${p.sku}`,
        link: `/dashboard/inventory/product/${p.id}`,
        meta: `Stock: ${p.inventory.reduce(
          (sum, i) => sum + i.quantityOnHand,
          0
        )}`,
      })),
      ...orders.map((o) => ({
        id: o.id,
        type: "order",
        title: o.orderNumber,
        subtitle: o.customerName,
        link: `/dashboard/orders/${o.id}`,
        meta: o.status,
      })),
    ];

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
