// app/api/analytics/product/[variantId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getProductAnalytics } from "@/lib/analytics/product-analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: { variantId: string } }
) {
  try {
    const { variantId } = params;

    if (!variantId) {
      return NextResponse.json(
        { error: "Product variant ID is required" },
        { status: 400 }
      );
    }

    const analytics = await getProductAnalytics(variantId);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching product analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
