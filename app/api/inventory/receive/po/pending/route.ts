// app/api/inventory/receive/po/pending/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: Check if user has permission to view pending approvals
    const canViewPending =
      session.user.role === "ADMIN" ||
      session.user.role === "MANAGER" ||
      session.user.role === "STAFF"; // Staff can view their own

    if (!canViewPending) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 }
      );
    }

    // Build where clause based on user role
    const whereClause: any = {
      status: "PENDING",
    };

    // If staff, only show their own submissions
    if (session.user.role === "STAFF") {
      whereClause.countedBy = session.user.id;
    }

    const pendingSessions = await prisma.receivingSession.findMany({
      where: whereClause,
      include: {
        lineItems: {
          orderBy: {
            sku: "asc", // Order line items alphabetically by SKU
          },
        },
        countedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true, // Include role for display
          },
        },
      },
      orderBy: {
        countedAt: "desc", // Most recent first
      },
    });

    // Calculate summary statistics
    const summary = {
      totalPending: pendingSessions.length,
      totalItems: pendingSessions.reduce(
        (sum, session) => sum + session.lineItems.length,
        0
      ),
      totalUnits: pendingSessions.reduce(
        (sum, session) =>
          sum +
          session.lineItems.reduce(
            (lineSum, line) => lineSum + line.quantityCounted,
            0
          ),
        0
      ),
      sessionsWithVariances: pendingSessions.filter((session) =>
        session.lineItems.some(
          (line) => line.variance !== null && line.variance !== 0
        )
      ).length,
      oldestSession:
        pendingSessions.length > 0
          ? pendingSessions[pendingSessions.length - 1].countedAt
          : null,
    };

    // Enhance each session with computed fields
    const enhancedSessions = pendingSessions.map((session) => {
      const totalCounted = session.lineItems.reduce(
        (sum, line) => sum + line.quantityCounted,
        0
      );
      const totalExpected = session.lineItems.reduce(
        (sum, line) => sum + (line.quantityExpected || 0),
        0
      );
      const totalVariance = session.lineItems.reduce(
        (sum, line) => sum + (line.variance || 0),
        0
      );
      const variancePercentage =
        totalExpected > 0
          ? ((totalVariance / totalExpected) * 100).toFixed(2)
          : "0";

      const itemsWithVariance = session.lineItems.filter(
        (line) => line.variance !== null && Math.abs(line.variance) > 0
      ).length;

      const largestVariance = session.lineItems.reduce((max, line) => {
        const absVariance = Math.abs(line.variance || 0);
        return absVariance > max ? absVariance : max;
      }, 0);

      // Calculate how long it's been pending
      const hoursPending =
        (new Date().getTime() - new Date(session.countedAt).getTime()) /
        (1000 * 60 * 60);

      return {
        ...session,
        computed: {
          totalCounted,
          totalExpected,
          totalVariance,
          variancePercentage: parseFloat(variancePercentage),
          itemsWithVariance,
          largestVariance,
          hoursPending: Math.round(hoursPending * 10) / 10,
          needsAttention:
            Math.abs(parseFloat(variancePercentage)) > 10 || hoursPending > 24, // Flag if >10% variance or pending >24hrs
        },
      };
    });

    // Sort by priority (sessions needing attention first)
    enhancedSessions.sort((a, b) => {
      if (a.computed.needsAttention && !b.computed.needsAttention) return -1;
      if (!a.computed.needsAttention && b.computed.needsAttention) return 1;
      return new Date(b.countedAt).getTime() - new Date(a.countedAt).getTime();
    });

    return NextResponse.json({
      success: true,
      sessions: enhancedSessions,
      summary,
      userRole: session.user.role,
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch pending sessions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        sessions: [],
        summary: null,
      },
      { status: 500 }
    );
  }
}

// // app/api/inventory/receive-po/pending/route.ts
// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";

// export async function GET(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const pendingSessions = await prisma.receivingSession.findMany({
//       where: {
//         status: "PENDING",
//       },
//       include: {
//         lineItems: true,
//         countedByUser: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       sessions: pendingSessions,
//     });
//   } catch (error: any) {
//     console.error("❌ Failed to fetch pending sessions:", error);
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }
