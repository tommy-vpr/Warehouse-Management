// app/api/picking/lists/[id]/reassign/route.ts
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

    const { id: pickListId } = await params;
    const body = (await req.json()) as ReassignmentRequest;
    const { newAssignedTo, reason, notes } = body;

    if (!newAssignedTo || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: newAssignedTo, reason" },
        { status: 400 }
      );
    }

    // Get current pick list
    const currentPickList = await prisma.pickList.findUnique({
      where: { id: pickListId },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!currentPickList) {
      return NextResponse.json(
        { error: "Pick list not found" },
        { status: 404 }
      );
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
      // 1. Update pick list
      const updatedPickList = await tx.pickList.update({
        where: { id: pickListId },
        data: { assignedTo: newAssignedTo },
        include: {
          assignedUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 2. Create reassignment event
      const event = await tx.pickEvent.create({
        data: {
          pickListId,
          eventType: "PICK_REASSIGNED",
          userId: session.user.id, // Manager who performed reassignment
          data: {
            fromUserId: currentPickList.assignedTo,
            fromUserName: currentPickList.assignedUser?.name,
            toUserId: newAssignedTo,
            toUserName: newUser.name,
            reason,
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

      return { pickList: updatedPickList, event };
    });

    const response: ReassignmentResponse = {
      success: true,
      pickList: {
        id: result.pickList.id,
        batchNumber: result.pickList.batchNumber,
        assignedTo: result.pickList.assignedTo || "",
        assignedToUser: result.pickList.assignedUser,
      },
      event: {
        id: result.event.id,
        eventType: result.event.eventType,
        fromUser: currentPickList.assignedUser?.name || null,
        toUser: newUser.name,
        timestamp: result.event.createdAt.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Pick list reassignment error:", error);
    return NextResponse.json(
      {
        error: "Failed to reassign pick list",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
