// app/api/returns/lookup-order/route.ts
// API route to lookup order for return eligibility

import { NextRequest, NextResponse } from "next/server";
import { returnService } from "@/lib/services/returnServices";
import { OrderLookupRequest } from "@/types/returns";

export async function POST(request: NextRequest) {
  try {
    const body: OrderLookupRequest = await request.json();

    const { orderNumber, customerEmail } = body;

    if (!orderNumber || !customerEmail) {
      return NextResponse.json(
        { error: "Order number and customer email are required" },
        { status: 400 }
      );
    }

    const result = await returnService.lookupOrderForReturn({
      orderNumber: orderNumber.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error looking up order:", error);
    return NextResponse.json(
      { error: "Failed to lookup order" },
      { status: 500 }
    );
  }
}
