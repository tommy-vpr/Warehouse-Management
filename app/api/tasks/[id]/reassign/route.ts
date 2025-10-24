// app/api/tasks/[id]/reassign/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type {
  ReassignmentRequest,
  ReassignmentResponse,
} from "@/types/audit-trail";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions - only ADMIN or MANAGER can reassign
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id: taskId } = await params;
    const body = (await req.json()) as ReassignmentRequest;
    const { newAssignedTo, reason, notes } = body;

    if (!newAssignedTo || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: newAssignedTo, reason" },
        { status: 400 }
      );
    }

    // Get current task
    const currentTask = await prisma.workTask.findUnique({
      where: { id: taskId },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get new assignee
    const newUser = await prisma.user.findUnique({
      where: { id: newAssignedTo },
      select: { id: true, name: true, email: true },
    });

    if (!newUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Perform reassignment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update task
      const updatedTask = await tx.workTask.update({
        where: { id: taskId },
        data: { assignedTo: newAssignedTo },
        include: {
          assignedUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 2. Create reassignment event
      const event = await tx.taskEvent.create({
        data: {
          taskId,
          eventType: "TASK_REASSIGNED",
          userId: session.user.id, // Manager who performed reassignment
          data: {
            fromUserId: currentTask.assignedTo,
            fromUserName: currentTask.assignedUser?.name,
            toUserId: newAssignedTo,
            toUserName: newUser.name,
            reason,
            progress: {
              completedItems: currentTask.completedItems,
              totalItems: currentTask.totalItems,
              completedOrders: currentTask.completedOrders,
              totalOrders: currentTask.totalOrders,
            },
            timestamp: new Date().toISOString(),
            reassignedBy: session.user.id,
            reassignedByName: session.user.name,
          },
          notes: notes || null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return { task: updatedTask, event };
    });

    const response: ReassignmentResponse = {
      success: true,
      task: {
        id: result.task.id,
        taskNumber: result.task.taskNumber,
        type: result.task.type,
        assignedTo: result.task.assignedTo,
        assignedUser: result.task.assignedUser,
        progress: {
          completedItems: result.task.completedItems,
          totalItems: result.task.totalItems,
          completedOrders: result.task.completedOrders,
          totalOrders: result.task.totalOrders,
        },
      },
      event: {
        id: result.event.id,
        eventType: result.event.eventType,
        fromUser: currentTask.assignedUser?.name || null,
        toUser: newUser.name,
        timestamp: result.event.createdAt.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Task reassignment error:", error);
    return NextResponse.json(
      {
        error: "Failed to reassign task",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
