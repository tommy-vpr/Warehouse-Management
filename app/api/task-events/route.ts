// app/api/task-events/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/task-events
 * Fetch task events with optional filters
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const type = searchParams.get("type"); // PACKING, PICKING, etc.
  const eventType = searchParams.get("eventType"); // TASK_REASSIGNED, etc.
  const taskId = searchParams.get("taskId");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    // Build where clause
    const where: any = {};

    if (taskId) {
      where.taskId = taskId;
    }

    if (type) {
      // Filter by task type through the task relation
      where.task = {
        type: type,
      };
    }

    if (eventType) {
      // Support comma-separated event types
      const eventTypes = eventType.split(",").map((e) => e.trim());
      where.eventType = {
        in: eventTypes,
      };
    }

    // Fetch events
    const events = await prisma.taskEvent.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            taskNumber: true,
            type: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    console.log(`✅ Found ${events.length} task events`);

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching task events:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch task events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
