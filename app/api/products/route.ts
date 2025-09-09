import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");

    const products = await prisma.product.findMany({
      where: search
        ? {
            OR: [
              { sku: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      include: {
        variants: {
          include: {
            inventory: {
              include: {
                location: true,
              },
            },
          },
        },
      },
      take: limit,
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Add calculated totals for each variant
    const productsWithTotals = products.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => {
        const totalQuantity = variant.inventory.reduce(
          (sum, inv) => sum + inv.quantityOnHand,
          0
        );
        const totalReserved = variant.inventory.reduce(
          (sum, inv) => sum + inv.quantityReserved,
          0
        );
        const totalAvailable = totalQuantity - totalReserved;

        return {
          ...variant,
          totalQuantity,
          totalReserved,
          totalAvailable,
          inventory: variant.inventory.map((inv) => ({
            ...inv,
            quantityAvailable: Math.max(
              0,
              inv.quantityOnHand - inv.quantityReserved
            ),
          })),
        };
      }),
    }));

    return NextResponse.json(productsWithTotals);
  } catch (error) {
    console.error("Error fetching products:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch products";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sku, name, description, upc, costPrice, sellingPrice } = body;

    // Validate required fields
    if (!sku || !name) {
      return NextResponse.json(
        { error: "SKU and name are required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        variants: {
          create: {
            sku, // Same SKU for single variant products
            name,
            upc,
            costPrice: costPrice ? parseFloat(costPrice) : null,
            sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
          },
        },
      },
      include: {
        variants: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error creating product:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to create product";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
