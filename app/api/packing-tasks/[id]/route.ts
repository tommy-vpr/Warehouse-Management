// app/api/packing-tasks/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.workTask.findUnique({
      where: {
        id: params.id,
        type: "PACKING",
      },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        taskItems: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                customerName: true,
              },
            },
          },
          orderBy: { sequence: "asc" },
        },
        parentTask: true,
        continuations: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Packing task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching packing task:", error);
    return NextResponse.json(
      { error: "Failed to fetch packing task" },
      { status: 500 }
    );
  }
}
