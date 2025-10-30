// app/api/inventory/po-barcode/scan-product/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // ✅ Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ✅ Parse body
    const {
      poId,
      upc,
      sku,
      quantity = 1,
      source = "SCAN_GUN",
    } = await req.json();

    if (!poId || (!upc && !sku))
      return NextResponse.json(
        { error: "PO ID and UPC/SKU required" },
        { status: 400 }
      );

    const qty = Number(quantity);
    if (!qty || qty < 1)
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });

    // ✅ Find product variant
    const variant = await prisma.productVariant.findFirst({
      where: {
        OR: [
          { sku: sku?.trim() },
          { upc: upc?.trim() },
          { barcode: upc?.trim() },
        ],
      },
      select: { id: true, sku: true, name: true },
    });

    if (!variant)
      return NextResponse.json(
        { error: "Product not found", success: false },
        { status: 404 }
      );

    // ✅ Get PO details for creating session if needed
    const poBarcode = await prisma.pOBarcode.findUnique({
      where: { poId },
      select: {
        poReference: true,
        vendorName: true,
      },
    });

    if (!poBarcode) {
      return NextResponse.json(
        { error: "PO not found", success: false },
        { status: 404 }
      );
    }

    // ✅ Find or create ReceivingSession
    let sessionRec = await prisma.receivingSession.findFirst({
      where: { poId, status: "PENDING" },
      select: { id: true, status: true },
    });

    if (!sessionRec) {
      // ✅ Create with all required fields
      sessionRec = await prisma.receivingSession.create({
        data: {
          poId,
          poReference: poBarcode.poReference,
          vendor: poBarcode.vendorName,
          status: "PENDING",
          countedBy: session.user.id, // ✅ User doing the receiving
          countedAt: new Date(),
        },
        select: { id: true, status: true },
      });
      console.log("🆕 Created receiving session:", sessionRec.id);
    }

    if (sessionRec.status !== "PENDING") {
      return NextResponse.json(
        { error: "Receiving session not open", success: false },
        { status: 400 }
      );
    }

    // ✅ Atomic update (upsert line, log event, bump barcode)
    const updatedLine = await prisma.$transaction(async (tx) => {
      // Upsert line record
      const line = await tx.receivingLine.upsert({
        where: {
          sessionId_sku: {
            sessionId: sessionRec!.id,
            sku: variant.sku,
          },
        },
        update: {
          quantityCounted: { increment: qty },
        },
        create: {
          sessionId: sessionRec!.id,
          sku: variant.sku,
          productName: variant.name,
          quantityCounted: qty,
        },
      });

      // Create audit log
      await tx.receivingEvent.create({
        data: {
          sessionId: sessionRec!.id,
          sku: variant.sku,
          productId: variant.id,
          userId: session.user.id,
          quantity: qty,
          source,
        },
      });

      // Update PO barcode record
      await tx.pOBarcode.updateMany({
        where: { poId },
        data: {
          scannedCount: { increment: qty },
          lastScannedAt: new Date(),
          lastScannedBy: session.user.id,
        },
      });

      return line;
    });

    return NextResponse.json({
      success: true,
      variant,
      quantity: qty,
      updatedLine,
    });
  } catch (err: any) {
    console.error("❌ Scan-product failed:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";

// export async function POST(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const body = await request.json();
//     const { upc, sku } = body; // Can scan by UPC or manually enter SKU

//     if (!upc && !sku) {
//       return NextResponse.json(
//         { error: "UPC or SKU required" },
//         { status: 400 }
//       );
//     }

//     // Look up product by UPC or SKU
//     let variant;

//     if (upc) {
//       variant = await prisma.productVariant.findFirst({
//         where: {
//           OR: [{ upc: upc.trim() }, { barcode: upc.trim() }],
//         },
//         select: {
//           id: true,
//           sku: true,
//           name: true,
//           upc: true,
//           barcode: true,
//         },
//       });
//     } else if (sku) {
//       variant = await prisma.productVariant.findUnique({
//         where: { sku: sku.trim() },
//         select: {
//           id: true,
//           sku: true,
//           name: true,
//           upc: true,
//           barcode: true,
//         },
//       });
//     }

//     if (!variant) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Product not found",
//           scannedValue: upc || sku,
//         },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       product: variant,
//       message: "Product found",
//     });
//   } catch (error: any) {
//     console.error("❌ Failed to scan product:", error);
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }
