// app/api/inventory/receive/po/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/ably-server"; // ✅ Import notification helper

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      poId,
      poReference,
      vendor,
      lineCounts,
      expectedQuantities,
      assignedTo, // ✅ Selected approver
    } = body;

    // ✅ Validate assignedTo if provided
    if (assignedTo) {
      const approver = await prisma.user.findUnique({
        where: { id: assignedTo },
        select: { role: true },
      });

      if (!approver || !["ADMIN", "MANAGER"].includes(approver.role)) {
        return NextResponse.json(
          { error: "Selected approver must be an Admin or Manager" },
          { status: 400 }
        );
      }
    }

    const existingSession = await prisma.receivingSession.findFirst({
      where: {
        poId,
        status: "PENDING",
        submittedAt: null,
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

    const receivingSession = await prisma.$transaction(async (tx) => {
      // Update line items
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

      // ✅ Mark session as submitted with assigned approver
      return tx.receivingSession.update({
        where: { id: existingSession.id },
        data: {
          submittedAt: new Date(),
          assignedTo,
          status: "PENDING",
        },
        include: {
          lineItems: true,
          countedByUser: {
            select: { name: true, email: true },
          },
          assignedToUser: {
            select: { name: true, email: true },
          },
        },
      });
    });

    // ✅ Send notification to assigned approver
    if (assignedTo) {
      const totalItems = receivingSession.lineItems.length;
      const totalUnits = receivingSession.lineItems.reduce(
        (sum, line) => sum + line.quantityCounted,
        0
      );
      const hasVariances = receivingSession.lineItems.some(
        (line) => line.variance !== 0
      );

      await notifyUser(assignedTo, {
        type: "RECEIVING_APPROVAL",
        title: "New Receiving Awaiting Approval",
        message: `${
          receivingSession.countedByUser.name || "A staff member"
        } submitted receiving for PO ${poReference} (${vendor}). ${totalItems} SKUs, ${totalUnits} units${
          hasVariances ? " - has variances" : ""
        }.`,
        link: `/dashboard/inventory/receive/pending`,
        metadata: {
          sessionId: receivingSession.id,
          poReference,
          vendor,
          countedBy: receivingSession.countedByUser.name,
          totalItems,
          totalUnits,
          hasVariances,
        },
      });

      console.log(
        `✅ Sent approval notification to ${receivingSession.assignedToUser?.email}`
      );
    }

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
//     const {
//       poId,
//       poReference,
//       vendor,
//       lineCounts,
//       expectedQuantities,
//       assignedTo, // ✅ NEW: Selected approver
//     } = body;

//     // ✅ Validate assignedTo if provided
//     if (assignedTo) {
//       const approver = await prisma.user.findUnique({
//         where: { id: assignedTo },
//         select: { role: true },
//       });

//       if (!approver || !["ADMIN", "MANAGER"].includes(approver.role)) {
//         return NextResponse.json(
//           { error: "Selected approver must be an Admin or Manager" },
//           { status: 400 }
//         );
//       }
//     }

//     const existingSession = await prisma.receivingSession.findFirst({
//       where: {
//         poId,
//         status: "PENDING",
//         submittedAt: null,
//       },
//       include: {
//         lineItems: true,
//       },
//     });

//     if (!existingSession) {
//       return NextResponse.json(
//         { error: "No active receiving session found for this PO" },
//         { status: 404 }
//       );
//     }

//     const receivingSession = await prisma.$transaction(async (tx) => {
//       // Update line items
//       for (const [sku, counted] of Object.entries(lineCounts)) {
//         const expected = expectedQuantities?.[sku] || null;
//         const variance =
//           expected !== null ? (counted as number) - expected : null;

//         await tx.receivingLine.updateMany({
//           where: {
//             sessionId: existingSession.id,
//             sku,
//           },
//           data: {
//             quantityExpected: expected,
//             variance,
//           },
//         });
//       }

//       // ✅ Mark session as submitted with assigned approver
//       return tx.receivingSession.update({
//         where: { id: existingSession.id },
//         data: {
//           submittedAt: new Date(),
//           assignedTo, // ✅ NEW: Save assigned approver
//           status: "PENDING",
//         },
//         include: {
//           lineItems: true,
//           countedByUser: {
//             select: { name: true, email: true },
//           },
//           assignedToUser: {
//             // ✅ Include assigned user info
//             select: { name: true, email: true },
//           },
//         },
//       });
//     });

//     return NextResponse.json({
//       success: true,
//       receivingSession,
//       message: `Receiving session submitted for approval.`,
//     });
//   } catch (error: any) {
//     console.error("❌ Failed to submit receiving session:", error);
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }
