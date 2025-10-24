// app/api/pick-events/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventTypes = searchParams.get("eventType")?.split(",") || [];
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build where clause
    const where: any = {};

    if (eventTypes.length > 0) {
      where.eventType = {
        in: eventTypes,
      };
    }

    // Fetch pick events
    const events = await prisma.pickEvent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        pickList: {
          select: {
            id: true,
            batchNumber: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Pick events fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch pick events",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
