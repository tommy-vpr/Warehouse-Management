// app/api/inventory/receive/po/route.ts
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
    const { poId, poReference, vendor, lineCounts, expectedQuantities } = body;

    // Calculate line items with variance
    const lineItems = Object.entries(lineCounts).map(([sku, counted]) => {
      const expected = expectedQuantities?.[sku] || null;
      const variance =
        expected !== null ? (counted as number) - expected : null;

      // Get product name from expectedQuantities metadata if available
      const productName = expectedQuantities?.metadata?.[sku]?.name || sku;

      // Add validation
      if (variance && Math.abs(variance) > expected * 0.5) {
        console.warn(`Large variance for ${sku}: ${variance}`);
      }

      return {
        sku,
        productName,
        quantityCounted: counted as number,
        quantityExpected: expected,
        variance,
      };
    });

    // Create receiving session (PENDING status)
    const receivingSession = await prisma.$transaction(async (tx) => {
      return tx.receivingSession.create({
        data: {
          poId,
          poReference,
          vendor,
          status: "PENDING",
          countedBy: session.user.id,
          lineItems: {
            create: lineItems,
          },
        },
        include: {
          lineItems: true,
          countedByUser: {
            select: { name: true, email: true },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      receivingSession,
      message: `Receiving session created. Awaiting approval.`,
    });
  } catch (error: any) {
    console.error("❌ Failed to create receiving session:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
