// app/api/inventory/po-barcode/generate/route.ts
// FIXED VERSION - Uses your existing BASE_URL
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { poId } = body;

    if (!poId) {
      return NextResponse.json({ error: "PO ID required" }, { status: 400 });
    }

    // Check if barcode already exists
    const existingBarcode = await prisma.pOBarcode.findUnique({
      where: { poId },
    });

    if (existingBarcode) {
      return NextResponse.json({
        success: true,
        barcode: existingBarcode,
        message: "Barcode already exists for this PO",
      });
    }

    // ✅ Use BASE_URL from environment (works with Cloudflare Tunnel)
    const baseUrl =
      process.env.BASE_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    console.log(
      `🔍 Fetching PO from: ${baseUrl}/api/inventory-planner/purchase-orders/${poId}`
    );

    // Fetch PO details from Inventory Planner
    const poResponse = await fetch(
      `${baseUrl}/api/inventory-planner/purchase-orders/${poId}`,
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
    const po = poData.purchaseOrder;

    if (!po) {
      throw new Error("Purchase order not found in response");
    }

    console.log(
      `✅ Found PO: ${po.reference} with ${po.line_items?.length || 0} items`
    );

    // Generate unique barcode value
    const shortId = nanoid(8).toUpperCase();
    const barcodeValue = `PO-${po.reference}-${shortId}`;

    // Map line items with UPC lookup
    const expectedItems = await Promise.all(
      (po.line_items || []).map(async (item: any) => {
        // Try to find UPC from ProductVariant
        const variant = await prisma.productVariant.findUnique({
          where: { sku: item.sku.trim() },
          select: {
            upc: true,
            barcode: true,
          },
        });

        return {
          sku: item.sku,
          name: item.product_name,
          quantity: item.quantity_ordered,
          upc: variant?.upc || null,
          barcode: variant?.barcode || null,
        };
      })
    );

    const totalExpectedQty = (po.line_items || []).reduce(
      (sum: number, item: any) => sum + item.quantity_ordered,
      0
    );

    // Create barcode record
    const barcode = await prisma.pOBarcode.create({
      data: {
        poId: po.id,
        poReference: po.reference,
        vendorName: po.vendor_name || "Unknown Vendor",
        barcodeValue,
        barcodeType: "CODE128",
        expectedItems,
        totalExpectedQty,
        status: "ACTIVE",
        lastPrintedAt: new Date(),
        lastPrintedBy: session.user.id,
      },
    });

    console.log(`✅ Barcode generated: ${barcodeValue}`);

    return NextResponse.json({
      success: true,
      barcode,
      message: "Barcode generated successfully",
    });
  } catch (error: any) {
    console.error("❌ Failed to generate barcode:", error);
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
