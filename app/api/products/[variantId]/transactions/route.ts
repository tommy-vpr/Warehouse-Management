// app/api/products/[variantId]/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getProductTransactions } from "@/lib/services/product-transactions";

export async function GET(
  request: NextRequest,
  { params }: { params: { variantId: string } }
) {
  try {
    const { variantId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!variantId) {
      return NextResponse.json(
        { error: "Product variant ID is required" },
        { status: 400 }
      );
    }

    const transactions = await getProductTransactions(variantId, limit);

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching product transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
