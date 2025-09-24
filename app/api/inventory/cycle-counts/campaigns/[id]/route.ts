// app/api/inventory/cycle-counts/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// app/api/inventory/cycle-counts/campaigns/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaignId = params.id;
    const { searchParams } = new URL(request.url);
    const includeCompleted = searchParams.get("includeCompleted") === "true";

    const campaign = await prisma.cycleCountCampaign.findUnique({
      where: { id: campaignId },
      include: {
        tasks: {
          include: {
            location: true,
            productVariant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    brand: true,
                    category: true,
                  },
                },
              },
            },
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: [{ priority: "desc" }, { taskNumber: "asc" }],
          ...(includeCompleted
            ? {}
            : {
                where: {
                  status: {
                    notIn: ["COMPLETED", "SKIPPED"],
                  },
                },
              }),
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Calculate enhanced statistics
    const stats = {
      totalTasks: campaign.totalTasks,
      completed: campaign.completedTasks,
      pending: campaign.tasks.filter((t) => t.status === "PENDING").length,
      assigned: campaign.tasks.filter((t) => t.status === "ASSIGNED").length,
      inProgress: campaign.tasks.filter((t) => t.status === "IN_PROGRESS")
        .length,
      varianceReview: campaign.tasks.filter(
        (t) => t.status === "VARIANCE_REVIEW"
      ).length,
      recountRequired: campaign.tasks.filter(
        (t) => t.status === "RECOUNT_REQUIRED"
      ).length,
      skipped: campaign.tasks.filter((t) => t.status === "SKIPPED").length,
      variances: campaign.variancesFound,

      // Calculate accuracy metrics
      accuracy:
        campaign.completedTasks > 0
          ? ((campaign.completedTasks - campaign.variancesFound) /
              campaign.completedTasks) *
            100
          : 0,

      // Estimate time remaining
      avgTaskTime: calculateAverageTaskTime(campaign.tasks),
      estimatedCompletion: estimateCompletion(campaign.tasks),
    };

    // Calculate accuracy before returning
    const accuracy =
      campaign.completedTasks > 0
        ? ((campaign.completedTasks - campaign.variancesFound) /
            campaign.completedTasks) *
          100
        : 100;

    // Convert Prisma Decimal fields to numbers before returning
    const campaignWithNumbers = {
      ...campaign,
      tasks: campaign.tasks.map((task) => ({
        ...task,
        variancePercentage: task.variancePercentage
          ? Number(task.variancePercentage)
          : null,
        tolerancePercentage: task.tolerancePercentage
          ? Number(task.tolerancePercentage)
          : null,
      })),
    };

    return NextResponse.json({
      ...campaignWithNumbers,
      accuracy,
      stats,
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json();
    const campaignId = params.id;

    // Validate status
    const validStatuses = [
      "PLANNED",
      "ACTIVE",
      "PAUSED",
      "COMPLETED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update campaign status
    const updatedCampaign = await prisma.cycleCountCampaign.update({
      where: { id: campaignId },
      data: {
        status,
        ...(status === "COMPLETED" ? { endDate: new Date() } : {}),
      },
    });

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateAverageTaskTime(tasks: any[]) {
  const completedTasks = tasks.filter(
    (t) =>
      t.completedAt &&
      t.startedAt &&
      ["COMPLETED", "SKIPPED"].includes(t.status)
  );

  if (completedTasks.length === 0) return null;

  const totalTime = completedTasks.reduce((sum, task) => {
    const duration =
      new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime();
    return sum + duration;
  }, 0);

  return Math.round(totalTime / completedTasks.length / 1000 / 60); // Average in minutes
}

function estimateCompletion(tasks: any[]) {
  const avgTime = calculateAverageTaskTime(tasks);
  if (!avgTime) return null;

  const remainingTasks = tasks.filter(
    (t) => !["COMPLETED", "SKIPPED"].includes(t.status)
  ).length;

  return remainingTasks * avgTime; // Estimated minutes remaining
}
