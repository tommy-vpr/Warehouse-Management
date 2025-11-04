// app/api/returns/[rmaNumber]/inspect-item/route.ts
// API route to inspect a return item with multiple inspection entries

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ rmaNumber: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Unwrap params in Next.js 15
    const { rmaNumber } = await params;
    const body = await request.json();

    console.log("📋 Inspecting item for RMA:", rmaNumber, body);

    // --- Validate basic shape ---
    if (!body.returnItemId || !Array.isArray(body.inspections)) {
      return NextResponse.json(
        {
          error:
            "Invalid request: must include returnItemId and inspections array",
        },
        { status: 400 }
      );
    }

    // --- Fetch related entities ---
    const returnOrder = await prisma.returnOrder.findUnique({
      where: { rmaNumber },
    });

    if (!returnOrder) {
      return NextResponse.json(
        { error: "Return order not found" },
        { status: 404 }
      );
    }

    const returnItem = await prisma.returnItem.findUnique({
      where: { id: body.returnItemId },
    });

    if (!returnItem) {
      return NextResponse.json(
        { error: "Return item not found" },
        { status: 404 }
      );
    }

    // --- Validate and prepare inspections ---
    const validConditions = [
      "NEW_UNOPENED",
      "NEW_OPENED",
      "LIKE_NEW",
      "GOOD",
      "FAIR",
      "POOR",
      "DEFECTIVE",
      "DAMAGED",
      "EXPIRED",
      "MISSING_PARTS",
    ];

    const validDispositions = [
      "RESTOCK",
      "DISPOSE",
      "REPAIR",
      "VENDOR_RETURN",
      "DONATE",
      "QUARANTINE",
      "LIQUIDATE",
    ];

    let totalQty = 0;
    for (const [i, insp] of body.inspections.entries()) {
      if (typeof insp.quantity !== "number" || insp.quantity <= 0) {
        return NextResponse.json(
          { error: `Inspection #${i + 1}: invalid quantity` },
          { status: 400 }
        );
      }
      if (!validConditions.includes(insp.condition)) {
        return NextResponse.json(
          {
            error: `Inspection #${i + 1}: invalid condition '${
              insp.condition
            }'`,
          },
          { status: 400 }
        );
      }
      if (!validDispositions.includes(insp.disposition)) {
        return NextResponse.json(
          {
            error: `Inspection #${i + 1}: invalid disposition '${
              insp.disposition
            }'`,
          },
          { status: 400 }
        );
      }
      if (insp.disposition === "RESTOCK" && !insp.restockLocationId) {
        return NextResponse.json(
          {
            error: `Inspection #${
              i + 1
            }: restockLocationId is required for RESTOCK disposition`,
          },
          { status: 400 }
        );
      }
      totalQty += insp.quantity;
    }

    console.log(`✅ Total quantity validated: ${totalQty}`);

    // --- Create inspections ---
    const createdInspections = await Promise.all(
      body.inspections.map((insp: any) =>
        prisma.returnInspection.create({
          data: {
            returnOrderId: returnOrder.id,
            returnItemId: returnItem.id,
            condition: insp.condition,
            conditionNotes: insp.conditionNotes || null,
            disposition: insp.disposition,
            dispositionNotes: insp.dispositionNotes || null,
            restockLocationId: insp.restockLocationId || null,
            inspectedBy: session.user.id,
            photoUrls: insp.photoUrls || [],
          },
        })
      )
    );

    console.log(`✅ Created ${createdInspections.length} inspection records`);

    // --- Update ReturnItem aggregates ---
    const restockQty = body.inspections
      .filter((i: any) => i.disposition === "RESTOCK")
      .reduce((sum: number, i: any) => sum + i.quantity, 0);
    const disposeQty = body.inspections
      .filter((i: any) => i.disposition === "DISPOSE")
      .reduce((sum: number, i: any) => sum + i.quantity, 0);

    await prisma.returnItem.update({
      where: { id: returnItem.id },
      data: {
        quantityReceived: totalQty,
        quantityRestockable: restockQty,
        quantityDisposed: disposeQty,
        status: "INSPECTED",
      },
    });

    console.log(
      `✅ Updated return item: restock=${restockQty}, dispose=${disposeQty}`
    );

    // --- Check if all items inspected, update return order status ---
    const allItems = await prisma.returnItem.findMany({
      where: { returnOrderId: returnOrder.id },
    });

    const allInspected = allItems.every((item) => item.status === "INSPECTED");

    if (allInspected) {
      await prisma.returnOrder.update({
        where: { id: returnOrder.id },
        data: {
          status: "INSPECTION_COMPLETE",
          inspectedAt: new Date(),
          inspectedBy: session.user.id,
        },
      });
      console.log(
        `✅ All items inspected - return order marked as INSPECTION_COMPLETE`
      );
    }

    // --- Log event ---
    await prisma.returnEvent.create({
      data: {
        returnOrderId: returnOrder.id,
        eventType: "ITEM_INSPECTED",
        userId: session.user.id,
        data: {
          returnItemId: returnItem.id,
          inspectionCount: createdInspections.length,
          totalQty,
          restockQty,
          disposeQty,
        },
      },
    });

    console.log(`✅ Inspection complete for item ${returnItem.id}`);

    return NextResponse.json({
      message: "Inspections recorded successfully",
      inspections: createdInspections,
      allItemsInspected: allInspected,
    });
  } catch (error: any) {
    console.error("❌ Error inspecting item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to inspect item" },
      { status: 500 }
    );
  }
}

// // app/api/returns/[rmaNumber]/inspect-item/route.ts
// // API route to inspect a return item with multiple inspection entries

// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma"; // or wherever your Prisma client lives

// export async function POST(
//   request: NextRequest,
//   { params }: { params: { rmaNumber: string } }
// ) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { rmaNumber } = params;
//     const body = await request.json();

//     // --- Validate basic shape ---
//     if (!body.returnItemId || !Array.isArray(body.inspections)) {
//       return NextResponse.json(
//         {
//           error:
//             "Invalid request: must include returnItemId and inspections array",
//         },
//         { status: 400 }
//       );
//     }

//     // --- Fetch related entities ---
//     const returnOrder = await prisma.returnOrder.findUnique({
//       where: { rmaNumber },
//     });

//     if (!returnOrder) {
//       return NextResponse.json(
//         { error: "Return order not found" },
//         { status: 404 }
//       );
//     }

//     const returnItem = await prisma.returnItem.findUnique({
//       where: { id: body.returnItemId },
//     });

//     if (!returnItem) {
//       return NextResponse.json(
//         { error: "Return item not found" },
//         { status: 404 }
//       );
//     }

//     // --- Validate and prepare inspections ---
//     const validConditions = [
//       "NEW_UNOPENED",
//       "NEW_OPENED",
//       "LIKE_NEW",
//       "GOOD",
//       "FAIR",
//       "POOR",
//       "DEFECTIVE",
//       "DAMAGED",
//       "EXPIRED",
//       "MISSING_PARTS",
//     ];

//     const validDispositions = [
//       "RESTOCK",
//       "DISPOSE",
//       "REPAIR",
//       "VENDOR_RETURN",
//       "DONATE",
//       "QUARANTINE",
//       "LIQUIDATE",
//     ];

//     let totalQty = 0;
//     for (const [i, insp] of body.inspections.entries()) {
//       if (typeof insp.quantity !== "number" || insp.quantity <= 0) {
//         return NextResponse.json(
//           { error: `Inspection #${i + 1}: invalid quantity` },
//           { status: 400 }
//         );
//       }
//       if (!validConditions.includes(insp.condition)) {
//         return NextResponse.json(
//           { error: `Inspection #${i + 1}: invalid condition` },
//           { status: 400 }
//         );
//       }
//       if (!validDispositions.includes(insp.disposition)) {
//         return NextResponse.json(
//           { error: `Inspection #${i + 1}: invalid disposition` },
//           { status: 400 }
//         );
//       }
//       if (insp.disposition === "RESTOCK" && !insp.restockLocationId) {
//         return NextResponse.json(
//           {
//             error: `Inspection #${
//               i + 1
//             }: restockLocationId is required for RESTOCK disposition`,
//           },
//           { status: 400 }
//         );
//       }
//       totalQty += insp.quantity;
//     }

//     // --- Create inspections ---
//     const createdInspections = await Promise.all(
//       body.inspections.map((insp: any) =>
//         prisma.returnInspection.create({
//           data: {
//             returnOrderId: returnOrder.id,
//             returnItemId: returnItem.id,
//             condition: insp.condition,
//             conditionNotes: insp.conditionNotes || null,
//             disposition: insp.disposition,
//             dispositionNotes: insp.dispositionNotes || null,
//             restockLocationId: insp.restockLocationId || null,
//             inspectedBy: session.user.id,
//             photoUrls: insp.photoUrls || [],
//           },
//         })
//       )
//     );

//     // --- Update ReturnItem aggregates ---
//     const restockQty = body.inspections
//       .filter((i: any) => i.disposition === "RESTOCK")
//       .reduce((sum: number, i: any) => sum + i.quantity, 0);
//     const disposeQty = body.inspections
//       .filter((i: any) => i.disposition === "DISPOSE")
//       .reduce((sum: number, i: any) => sum + i.quantity, 0);

//     await prisma.returnItem.update({
//       where: { id: returnItem.id },
//       data: {
//         quantityReceived: totalQty,
//         quantityRestockable: restockQty,
//         quantityDisposed: disposeQty,
//         status: "INSPECTED",
//       },
//     });

//     // --- Optionally: log event ---
//     await prisma.returnEvent.create({
//       data: {
//         returnOrderId: returnOrder.id,
//         eventType: "ITEM_INSPECTED",
//         userId: session.user.id,
//         data: { inspections: createdInspections },
//       },
//     });

//     return NextResponse.json({
//       message: "Inspections recorded successfully",
//       inspections: createdInspections,
//     });
//   } catch (error: any) {
//     console.error("Error inspecting item:", error);
//     return NextResponse.json(
//       { error: error.message || "Failed to inspect item" },
//       { status: 500 }
//     );
//   }
// }

// // app/api/returns/[rmaNumber]/inspect-item/route.ts
// // API route to inspect a return item

// import { NextRequest, NextResponse } from "next/server";
// import { returnService } from "@/lib/services/returnServices";
// import { InspectItemRequest } from "@/types/returns";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";

// export async function POST(
//   request: NextRequest,
//   { params }: { params: { rmaNumber: string } }
// ) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const body: InspectItemRequest = await request.json();

//     // Validate
//     if (!body.returnItemId || !body.condition || !body.disposition) {
//       return NextResponse.json(
//         { error: "Missing required inspection fields" },
//         { status: 400 }
//       );
//     }

//     if (body.quantityReceived < 0) {
//       return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
//     }

//     // If restocking, location is required
//     if (body.disposition === "RESTOCK" && !body.restockLocationId) {
//       return NextResponse.json(
//         { error: "Restock location is required for RESTOCK disposition" },
//         { status: 400 }
//       );
//     }

//     const result = await returnService.inspectReturnItem(body, session.user.id);

//     return NextResponse.json(result);
//   } catch (error: any) {
//     console.error("Error inspecting item:", error);
//     return NextResponse.json(
//       { error: error.message || "Failed to inspect item" },
//       { status: 500 }
//     );
//   }
// }
