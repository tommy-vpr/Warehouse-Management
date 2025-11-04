// app/api/returns/create/route.ts
// API route to create a new return (RMA)

import { NextRequest, NextResponse } from "next/server";
import { returnService } from "@/lib/services/returnServices";
import { CreateReturnRequest } from "@/types/returns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body: CreateReturnRequest = await request.json();

    // Validate request
    if (
      !body.orderId ||
      !body.customerEmail ||
      !body.reason ||
      !body.items?.length
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (body.items.some((item) => item.quantityRequested <= 0)) {
      return NextResponse.json(
        { error: "Invalid quantity requested" },
        { status: 400 }
      );
    }

    const result = await returnService.createReturn(body, session?.user?.id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error creating return:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create return" },
      { status: 500 }
    );
  }
}
