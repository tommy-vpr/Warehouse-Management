// app/api/staff/[staffId]/end-shift/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  findPickListsNeedingReassignment,
  bulkReassignStaffWork,
  getStaffPickingMetrics,
} from "@/lib/pickListHelpers";

/**
 * POST /api/staff/[staffId]/end-shift
 * Handle end of shift workflow for a staff member
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const body = await req.json();
  const {
    replacementStaffId,
    managerId,
    autoReassign = false,
    pauseOnly = false,
  } = body;

  try {
    // 1. Get all incomplete work
    const incompleteLists = await findPickListsNeedingReassignment(
      params.staffId
    );

    if (incompleteLists.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No incomplete work to process",
        incompleteLists: [],
        summary: {
          totalLists: 0,
          totalItems: 0,
          partialItems: 0,
        },
      });
    }

    // 2. Calculate metrics for the shift
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const metrics = await getStaffPickingMetrics(
      params.staffId,
      today,
      new Date()
    );

    // 3. Handle reassignment based on strategy
    let reassignmentResult = null;

    if (pauseOnly) {
      // Just pause lists without reassigning
      await prisma.pickList.updateMany({
        where: {
          id: { in: incompleteLists.map((pl) => pl.id) },
        },
        data: {
          status: "PAUSED",
          notes: "Paused at end of shift - awaiting reassignment",
        },
      });

      // Log pause events
      for (const list of incompleteLists) {
        await prisma.pickEvent.create({
          data: {
            pickListId: list.id,
            eventType: "PICK_PAUSED",
            userId: managerId || params.staffId,
            notes: "End of shift - paused for later assignment",
            data: {
              staffId: params.staffId,
              incompleteItems: list.incompleteItems,
              partialItems: list.partialItems,
            },
          },
        });
      }
    } else if (replacementStaffId) {
      // Explicit reassignment to replacement staff
      reassignmentResult = await bulkReassignStaffWork(
        params.staffId,
        replacementStaffId,
        managerId || params.staffId
      );
    } else if (autoReassign) {
      // Auto-assign to staff with lightest workload
      const availableStaff = await prisma.user.findMany({
        where: {
          role: "STAFF",
          id: { not: params.staffId },
        },
        include: {
          assignedPickLists: {
            where: {
              status: {
                in: ["ASSIGNED", "IN_PROGRESS"],
              },
            },
            include: {
              items: true,
            },
          },
        },
      });

      // Calculate workload
      const staffWithWorkload = availableStaff.map((s) => ({
        id: s.id,
        name: s.name,
        workload: s.assignedPickLists.reduce(
          (sum, pl) => sum + (pl.totalItems - pl.pickedItems),
          0
        ),
      }));

      // Sort by workload (ascending)
      staffWithWorkload.sort((a, b) => a.workload - b.workload);

      if (staffWithWorkload.length > 0) {
        const lightestStaff = staffWithWorkload[0];
        reassignmentResult = await bulkReassignStaffWork(
          params.staffId,
          lightestStaff.id,
          managerId || params.staffId
        );
      }
    }

    // 4. Update orders to remove staff assignment
    await prisma.order.updateMany({
      where: {
        pickingAssignedTo: params.staffId,
        status: {
          in: ["PICKING", "ALLOCATED"],
        },
      },
      data: {
        pickingAssignedTo: replacementStaffId || null,
      },
    });

    // 5. Generate shift summary
    const summary = {
      staffId: params.staffId,
      shiftMetrics: metrics,
      incompleteWork: {
        totalLists: incompleteLists.length,
        totalItems: incompleteLists.reduce(
          (sum, pl) => sum + pl.incompleteItems,
          0
        ),
        partialItems: incompleteLists.reduce(
          (sum, pl) => sum + pl.partialItems,
          0
        ),
      },
      action: pauseOnly ? "PAUSED" : "REASSIGNED",
      reassignment: reassignmentResult,
    };

    return NextResponse.json({
      success: true,
      message: `End of shift processed for staff member`,
      summary,
      incompleteLists: incompleteLists.map((pl) => ({
        id: pl.id,
        batchNumber: pl.batchNumber,
        incompleteItems: pl.incompleteItems,
        partialItems: pl.partialItems,
      })),
    });
  } catch (error) {
    console.error("End of shift error:", error);
    return NextResponse.json(
      { error: "Failed to process end of shift" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/staff/[staffId]/shift-summary
 * Get current shift summary for a staff member
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    // Get today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const metrics = await getStaffPickingMetrics(
      params.staffId,
      today,
      new Date()
    );

    // Get current work in progress
    const currentWork = await prisma.pickList.findMany({
      where: {
        assignedTo: params.staffId,
        status: {
          in: ["ASSIGNED", "IN_PROGRESS", "PAUSED"],
        },
      },
      include: {
        items: {
          where: {
            status: {
              notIn: ["PICKED"],
            },
          },
        },
      },
    });

    const workSummary = currentWork.map((pl) => ({
      id: pl.id,
      batchNumber: pl.batchNumber,
      status: pl.status,
      totalItems: pl.totalItems,
      pickedItems: pl.pickedItems,
      remainingItems: pl.totalItems - pl.pickedItems,
      partialItems: pl.items.filter(
        (item) =>
          item.quantityPicked > 0 && item.quantityPicked < item.quantityToPick
      ).length,
    }));

    return NextResponse.json({
      staffId: params.staffId,
      shiftMetrics: metrics,
      currentWork: workSummary,
      summary: {
        activePickLists: currentWork.length,
        totalRemaining: workSummary.reduce(
          (sum, w) => sum + w.remainingItems,
          0
        ),
        partialItems: workSummary.reduce((sum, w) => sum + w.partialItems, 0),
      },
    });
  } catch (error) {
    console.error("Shift summary error:", error);
    return NextResponse.json(
      { error: "Failed to get shift summary" },
      { status: 500 }
    );
  }
}

// app/api/staff/workload/route.ts
/**
 * GET /api/staff/workload
 * Get real-time workload for all staff members
 */
export async function GET(req: NextRequest) {
  try {
    const staff = await prisma.user.findMany({
      where: { role: "STAFF" },
      include: {
        assignedPickLists: {
          where: {
            status: {
              in: ["ASSIGNED", "IN_PROGRESS", "PAUSED"],
            },
          },
          include: {
            items: true,
          },
        },
        pickingOrders: {
          where: {
            status: {
              in: ["PICKING", "ALLOCATED"],
            },
          },
        },
      },
    });

    const workloadData = staff.map((s) => {
      const pickLists = s.assignedPickLists;
      const remainingItems = pickLists.reduce(
        (sum, pl) => sum + (pl.totalItems - pl.pickedItems),
        0
      );

      const partialItems = pickLists.reduce((sum, pl) => {
        const partial = pl.items.filter(
          (item) =>
            item.quantityPicked > 0 && item.quantityPicked < item.quantityToPick
        ).length;
        return sum + partial;
      }, 0);

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        activePickLists: pickLists.length,
        assignedOrders: s.pickingOrders.length,
        remainingItems,
        partialItems,
        workloadScore: remainingItems,
        status:
          remainingItems === 0
            ? "IDLE"
            : remainingItems < 50
            ? "LIGHT"
            : remainingItems < 150
            ? "MODERATE"
            : "HEAVY",
        pickLists: pickLists.map((pl) => ({
          id: pl.id,
          batchNumber: pl.batchNumber,
          status: pl.status,
          completionRate:
            pl.totalItems > 0
              ? Math.round((pl.pickedItems / pl.totalItems) * 100)
              : 0,
          remainingItems: pl.totalItems - pl.pickedItems,
        })),
      };
    });

    // Sort by workload
    workloadData.sort((a, b) => a.workloadScore - b.workloadScore);

    return NextResponse.json({
      staff: workloadData,
      summary: {
        totalStaff: staff.length,
        activeStaff: workloadData.filter((s) => s.status !== "IDLE").length,
        totalPickLists: workloadData.reduce(
          (sum, s) => sum + s.activePickLists,
          0
        ),
        totalItems: workloadData.reduce((sum, s) => sum + s.remainingItems, 0),
      },
    });
  } catch (error) {
    console.error("Workload error:", error);
    return NextResponse.json(
      { error: "Failed to get workload data" },
      { status: 500 }
    );
  }
}
