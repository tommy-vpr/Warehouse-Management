// app/api/inventory/po-barcode/scan/route.ts
// FIXED VERSION - Uses your existing BASE_URL
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { barcodeValue } = body;

    if (!barcodeValue) {
      return NextResponse.json(
        { error: "Barcode value required" },
        { status: 400 }
      );
    }

    // Look up barcode
    const poBarcode = await prisma.pOBarcode.findUnique({
      where: { barcodeValue: barcodeValue.trim() },
    });

    if (!poBarcode) {
      return NextResponse.json(
        { success: false, error: "PO barcode not found" },
        { status: 404 }
      );
    }

    // Check if already used
    if (poBarcode.status === "USED") {
      return NextResponse.json(
        {
          success: false,
          error: "This PO has already been received",
          barcode: poBarcode,
        },
        { status: 400 }
      );
    }

    // Update scan tracking
    await prisma.pOBarcode.update({
      where: { id: poBarcode.id },
      data: {
        scannedCount: {
          increment: 1,
        },
        lastScannedAt: new Date(),
        lastScannedBy: session.user.id,
      },
    });

    // ✅ Use BASE_URL from environment (works with Cloudflare Tunnel)
    const baseUrl =
      process.env.BASE_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    console.log(
      `🔍 Fetching PO from: ${baseUrl}/api/inventory-planner/purchase-orders/${poBarcode.poId}`
    );

    // Fetch full PO details
    const poResponse = await fetch(
      `${baseUrl}/api/inventory-planner/purchase-orders/${poBarcode.poId}`,
      {
        headers: {
          Cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (!poResponse.ok) {
      const errorText = await poResponse.text();
      console.error("❌ Failed to fetch PO:", errorText);
      throw new Error("Failed to fetch PO details");
    }

    const poData = await poResponse.json();

    console.log(`✅ PO loaded successfully for barcode: ${barcodeValue}`);

    return NextResponse.json({
      success: true,
      barcode: poBarcode,
      po: poData.purchaseOrder,
      message: "PO loaded successfully",
    });
  } catch (error: any) {
    console.error("❌ Failed to scan barcode:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
