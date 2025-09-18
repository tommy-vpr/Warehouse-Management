import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    console.log("=".repeat(50));
    console.log("INCOMING PAYLOAD:");
    console.log("=".repeat(50));
    console.log(JSON.stringify(body, null, 2));
    console.log("=".repeat(50));

    // Log individual fields for easy debugging
    console.log("Individual Fields:");
    console.log("orderId:", body.orderId);
    console.log("carrierCode:", body.carrierCode);
    console.log("serviceCode:", body.serviceCode);
    console.log("packages:", body.packages);
    console.log("shippingAddress:", body.shippingAddress);
    console.log("notes:", body.notes);
    console.log("=".repeat(50));

    // Validate required fields
    const missingFields = [];
    if (!body.orderId) missingFields.push("orderId");
    if (!body.carrierCode) missingFields.push("carrierCode");
    if (!body.serviceCode) missingFields.push("serviceCode");
    if (!body.packages || body.packages.length === 0)
      missingFields.push("packages");

    if (missingFields.length > 0) {
      console.log("❌ MISSING REQUIRED FIELDS:", missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    console.log("✅ All required fields present");

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Payload received and logged successfully",
      receivedData: {
        orderId: body.orderId,
        carrierCode: body.carrierCode,
        serviceCode: body.serviceCode,
        packageCount: body.packages?.length || 0,
        hasShippingAddress: !!body.shippingAddress,
        hasNotes: !!body.notes,
      },
    });
  } catch (error) {
    console.error("❌ ERROR in test route:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
