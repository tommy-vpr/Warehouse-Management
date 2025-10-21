// app/api/products/variants/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        sku: true,
        name: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!variant) {
      return NextResponse.json(
        { error: "Product variant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(variant);
  } catch (error) {
    console.error("Error fetching product variant:", error);
    return NextResponse.json(
      { error: "Failed to fetch product variant" },
      { status: 500 }
    );
  }
}
