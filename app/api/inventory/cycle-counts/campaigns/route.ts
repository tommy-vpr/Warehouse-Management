// app/api/inventory/cycle-counts/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const statusFilter = searchParams.get("status");
    const typeFilter = searchParams.get("type");

    // Build where clause for filtering campaigns
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    if (typeFilter && typeFilter !== "ALL") {
      where.countType = typeFilter;
    }

    // Get campaigns with basic task counts
    const campaigns = await prisma.cycleCountCampaign.findMany({
      where,
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: [
        { status: "asc" }, // Active campaigns first
        { createdAt: "desc" },
      ],
    });

    // Calculate dashboard statistics
    const stats = await calculateDashboardStats();

    return NextResponse.json({ campaigns, stats });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      description,
      countType,
      startDate,
      endDate,
      locationIds,
      zoneFilter,
      lastCountedBefore,
      abcClass,
    } = await request.json();

    // Validate required fields
    if (!name || !countType || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields: name, countType, startDate" },
        { status: 400 }
      );
    }

    // Create the campaign
    const campaign = await prisma.cycleCountCampaign.create({
      data: {
        name,
        description,
        countType,
        status: "PLANNED",
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        locationIds: locationIds || [],
        zoneFilter,
        lastCountedBefore: lastCountedBefore
          ? new Date(lastCountedBefore)
          : null,
        abcClass,
        createdBy: session.user.id,
        assignedTo: [], // Will be populated when tasks are created
      },
    });

    // Create tasks based on criteria (you can call the utility function here)
    // const taskIds = await CycleCountUtils.createTasksFromCriteria({
    //   countType,
    //   locationIds,
    //   zoneFilter,
    //   lastCountedBefore: lastCountedBefore ? new Date(lastCountedBefore) : undefined,
    //   abcClass,
    //   campaignId: campaign.id
    // });

    // Update campaign with task count
    // await prisma.cycleCountCampaign.update({
    //   where: { id: campaign.id },
    //   data: { totalTasks: taskIds.length }
    // });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}

// Dashboard statistics calculation function
async function calculateDashboardStats() {
  try {
    // Calculate date ranges
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get basic campaign counts
    const [totalCampaigns, activeCampaigns, completedThisWeek, pendingReviews] =
      await Promise.all([
        // Total campaigns ever created
        prisma.cycleCountCampaign.count(),

        // Currently active campaigns
        prisma.cycleCountCampaign.count({
          where: { status: "ACTIVE" },
        }),

        // Campaigns completed this week
        prisma.cycleCountCampaign.count({
          where: {
            status: "COMPLETED",
            endDate: { gte: weekAgo },
          },
        }),

        // Tasks requiring review (variance or recount)
        prisma.cycleCountTask.count({
          where: {
            OR: [{ status: "VARIANCE_REVIEW" }, { status: "RECOUNT_REQUIRED" }],
          },
        }),
      ]);

    // Calculate total variances in last 30 days
    const totalVariances = await prisma.cycleCountTask.count({
      where: {
        AND: [
          { variance: { not: null } },
          { variance: { not: 0 } },
          { completedAt: { gte: monthAgo } },
        ],
      },
    });

    // Calculate average accuracy for completed tasks in last 30 days
    const completedTasks = await prisma.cycleCountTask.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: monthAgo },
        variance: { not: null },
      },
      select: {
        systemQuantity: true,
        variance: true,
      },
    });

    let averageAccuracy = 100; // Default if no completed tasks

    if (completedTasks.length > 0) {
      const totalAccuracy = completedTasks.reduce((sum, task) => {
        if (task.systemQuantity === 0) {
          // If system quantity is 0, accuracy is 100% if variance is 0, otherwise 0%
          return sum + (task.variance === 0 ? 100 : 0);
        }

        // Calculate accuracy as percentage
        const variancePercentage =
          (Math.abs(task.variance || 0) / task.systemQuantity) * 100;
        const accuracy = Math.max(0, 100 - variancePercentage);
        return sum + accuracy;
      }, 0);

      averageAccuracy = totalAccuracy / completedTasks.length;
    }

    // Additional useful stats
    const campaignStats = await prisma.cycleCountCampaign.aggregate({
      where: {
        status: "COMPLETED",
        endDate: { gte: monthAgo },
      },
      _avg: {
        completedTasks: true,
        variancesFound: true,
      },
      _sum: {
        totalTasks: true,
        completedTasks: true,
      },
    });

    return {
      totalCampaigns,
      activeCampaigns,
      completedThisWeek,
      averageAccuracy: Math.round(averageAccuracy * 10) / 10, // Round to 1 decimal
      totalVariances,
      pendingReviews,

      // Additional insights
      tasksCompletedThisMonth: campaignStats._sum.completedTasks || 0,
      totalTasksThisMonth: campaignStats._sum.totalTasks || 0,
      averageVariancesPerCampaign:
        Math.round((campaignStats._avg.variancesFound || 0) * 10) / 10,
    };
  } catch (error) {
    console.error("Error calculating dashboard stats:", error);

    // Return default stats if calculation fails
    return {
      totalCampaigns: 0,
      activeCampaigns: 0,
      completedThisWeek: 0,
      averageAccuracy: 0,
      totalVariances: 0,
      pendingReviews: 0,
      tasksCompletedThisMonth: 0,
      totalTasksThisMonth: 0,
      averageVariancesPerCampaign: 0,
    };
  }
}
