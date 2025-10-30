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

    // ✅ Find the existing session that was created during scanning
    const existingSession = await prisma.receivingSession.findFirst({
      where: {
        poId,
        status: "PENDING",
        submittedAt: null, // ✅ Only find sessions that haven't been submitted yet
      },
      include: {
        lineItems: true,
      },
    });

    if (!existingSession) {
      return NextResponse.json(
        { error: "No active receiving session found for this PO" },
        { status: 404 }
      );
    }

    // ✅ Update the session to mark it as submitted
    const receivingSession = await prisma.$transaction(async (tx) => {
      // Update existing line items with expected quantities and variance
      for (const [sku, counted] of Object.entries(lineCounts)) {
        const expected = expectedQuantities?.[sku] || null;
        const variance =
          expected !== null ? (counted as number) - expected : null;

        await tx.receivingLine.updateMany({
          where: {
            sessionId: existingSession.id,
            sku,
          },
          data: {
            quantityExpected: expected,
            variance,
          },
        });
      }

      // ✅ Mark session as submitted for approval
      return tx.receivingSession.update({
        where: { id: existingSession.id },
        data: {
          submittedAt: new Date(), // ✅ This marks it as submitted
          status: "PENDING",
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
      message: `Receiving session submitted for approval.`,
    });
  } catch (error: any) {
    console.error("❌ Failed to submit receiving session:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// // app/api/inventory/receive/po/route.ts
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
//     const { poId, poReference, vendor, lineCounts, expectedQuantities } = body;

//     // Calculate line items with variance
//     const lineItems = Object.entries(lineCounts).map(([sku, counted]) => {
//       const expected = expectedQuantities?.[sku] || null;
//       const variance =
//         expected !== null ? (counted as number) - expected : null;

//       // Get product name from expectedQuantities metadata if available
//       const productName = expectedQuantities?.metadata?.[sku]?.name || sku;

//       // Add validation
//       if (variance && Math.abs(variance) > expected * 0.5) {
//         console.warn(`Large variance for ${sku}: ${variance}`);
//       }

//       return {
//         sku,
//         productName,
//         quantityCounted: counted as number,
//         quantityExpected: expected,
//         variance,
//       };
//     });

//     // Create receiving session (PENDING status)
//     const receivingSession = await prisma.$transaction(async (tx) => {
//       return tx.receivingSession.create({
//         data: {
//           poId,
//           poReference,
//           vendor,
//           status: "PENDING",
//           countedBy: session.user.id,
//           lineItems: {
//             create: lineItems,
//           },
//         },
//         include: {
//           lineItems: true,
//           countedByUser: {
//             select: { name: true, email: true },
//           },
//         },
//       });
//     });

//     return NextResponse.json({
//       success: true,
//       receivingSession,
//       message: `Receiving session created. Awaiting approval.`,
//     });
//   } catch (error: any) {
//     console.error("❌ Failed to create receiving session:", error);
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }
