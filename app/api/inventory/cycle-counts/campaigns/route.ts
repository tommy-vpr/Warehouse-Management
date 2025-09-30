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
    const productVariantId = searchParams.get("productVariantId"); // NEW

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

    // NEW: Filter by product variant
    if (productVariantId) {
      where.tasks = {
        some: {
          productVariantId: productVariantId,
        },
      };
    }

    // Get campaigns with task statistics
    const campaigns = await prisma.cycleCountCampaign.findMany({
      where,
      include: {
        tasks: {
          select: {
            status: true,
            variance: true,
            systemQuantity: true,
            productVariantId: true, // Include this if needed
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    // Transform campaigns to include computed fields
    const campaignsWithStats = campaigns.map((campaign) => {
      const completedTasks = campaign.tasks.filter((task) =>
        ["COMPLETED"].includes(task.status)
      ).length;

      const variancesFound = campaign.tasks.filter(
        (task) => task.variance !== null && task.variance !== 0
      ).length;

      // Calculate accuracy the same way as dashboard stats
      let accuracy = 100;
      const tasksWithVariance = campaign.tasks.filter(
        (task) => task.variance !== null && ["COMPLETED"].includes(task.status)
      );

      if (tasksWithVariance.length > 0) {
        const totalAccuracy = tasksWithVariance.reduce((sum, task) => {
          const taskAccuracy =
            task.systemQuantity > 0
              ? Math.max(
                  0,
                  100 -
                    (Math.abs(task.variance || 0) / task.systemQuantity) * 100
                )
              : 100;
          return sum + taskAccuracy;
        }, 0);
        accuracy =
          Math.round((totalAccuracy / tasksWithVariance.length) * 10) / 10;
      }

      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        countType: campaign.countType,
        status: campaign.status,
        startDate: campaign.startDate.toISOString(),
        endDate: campaign.endDate?.toISOString(),
        totalTasks: campaign.tasks.length,
        completedTasks,
        variancesFound,
        accuracy, // Add this field
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
        createdBy: campaign.createdBy,
        assignedTo: campaign.assignedTo,
      };
    });

    const stats = await calculateDashboardStats(productVariantId);
    return NextResponse.json({ campaigns: campaignsWithStats, stats });
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
      tolerancePercentage,
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
        assignedTo: [],
      },
    });

    let taskCount = 0;

    try {
      // Create tasks in a transaction for data consistency
      await prisma.$transaction(async (tx) => {
        const tolerance = tolerancePercentage
          ? parseFloat(tolerancePercentage)
          : 5.0;

        if (countType === "PARTIAL" && locationIds && locationIds.length > 0) {
          // Get all inventory items in selected locations
          const inventoryItems = await tx.inventory.findMany({
            where: {
              locationId: { in: locationIds },
              quantityOnHand: { gt: 0 },
            },
            include: { location: true, productVariant: true },
          });

          for (let i = 0; i < inventoryItems.length; i++) {
            const item = inventoryItems[i];
            await tx.cycleCountTask.create({
              data: {
                campaignId: campaign.id,
                locationId: item.locationId,
                productVariantId: item.productVariantId,
                taskNumber: `CC-${new Date().getFullYear()}-${campaign.id.slice(
                  -3
                )}-${String(i + 1).padStart(3, "0")}`,
                countType: campaign.countType,
                systemQuantity: item.quantityOnHand,
                tolerancePercentage: tolerance,
              },
            });
            taskCount++;
          }
        } else if (countType === "FULL") {
          // Get all inventory items
          const allInventory = await tx.inventory.findMany({
            where: { quantityOnHand: { gt: 0 } },
            include: { location: true, productVariant: true },
            take: 1000, // Reasonable limit for full counts
          });

          for (let i = 0; i < allInventory.length; i++) {
            const item = allInventory[i];
            await tx.cycleCountTask.create({
              data: {
                campaignId: campaign.id,
                locationId: item.locationId,
                productVariantId: item.productVariantId,
                taskNumber: `CC-${new Date().getFullYear()}-${campaign.id.slice(
                  -3
                )}-${String(i + 1).padStart(3, "0")}`,
                countType: campaign.countType,
                systemQuantity: item.quantityOnHand,
                tolerancePercentage: tolerance,
              },
            });
            taskCount++;
          }
        } else if (countType === "ZERO_STOCK") {
          // Find inventory with zero quantity
          const zeroStockItems = await tx.inventory.findMany({
            where: { quantityOnHand: 0 },
            include: { location: true, productVariant: true },
            take: 200,
          });

          for (let i = 0; i < zeroStockItems.length; i++) {
            const item = zeroStockItems[i];
            await tx.cycleCountTask.create({
              data: {
                campaignId: campaign.id,
                locationId: item.locationId,
                productVariantId: item.productVariantId,
                taskNumber: `CC-${new Date().getFullYear()}-${campaign.id.slice(
                  -3
                )}-${String(i + 1).padStart(3, "0")}`,
                countType: campaign.countType,
                systemQuantity: item.quantityOnHand,
                tolerancePercentage: tolerance,
              },
            });
            taskCount++;
          }
        } else if (countType === "NEGATIVE_STOCK") {
          // Find inventory with negative quantity
          const negativeItems = await tx.inventory.findMany({
            where: { quantityOnHand: { lt: 0 } },
            include: { location: true, productVariant: true },
            take: 100,
          });

          for (let i = 0; i < negativeItems.length; i++) {
            const item = negativeItems[i];
            await tx.cycleCountTask.create({
              data: {
                campaignId: campaign.id,
                locationId: item.locationId,
                productVariantId: item.productVariantId,
                taskNumber: `CC-${new Date().getFullYear()}-${campaign.id.slice(
                  -3
                )}-${String(i + 1).padStart(3, "0")}`,
                countType: campaign.countType,
                systemQuantity: item.quantityOnHand,
                tolerancePercentage: tolerance,
              },
            });
            taskCount++;
          }
        } else if (countType === "ABC_ANALYSIS") {
          // Get high-value items (you can adjust criteria based on your business logic)
          const highValueItems = await tx.inventory.findMany({
            where: {
              quantityOnHand: { gt: 0 },
              productVariant: {
                sellingPrice: { gte: 100 }, // Items worth $100 or more
              },
            },
            include: { location: true, productVariant: true },
            take: 300,
          });

          for (let i = 0; i < highValueItems.length; i++) {
            const item = highValueItems[i];
            await tx.cycleCountTask.create({
              data: {
                campaignId: campaign.id,
                locationId: item.locationId,
                productVariantId: item.productVariantId,
                taskNumber: `CC-${new Date().getFullYear()}-${campaign.id.slice(
                  -3
                )}-${String(i + 1).padStart(3, "0")}`,
                countType: campaign.countType,
                systemQuantity: item.quantityOnHand,
                tolerancePercentage: tolerance,
              },
            });
            taskCount++;
          }
        } else if (countType === "FAST_MOVING") {
          // Find items with recent sales activity (last 30 days)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

          const fastMovingItems = await tx.inventory.findMany({
            where: {
              quantityOnHand: { gt: 0 },
              productVariant: {
                inventoryTransactions: {
                  some: {
                    transactionType: "SALE",
                    createdAt: { gte: thirtyDaysAgo },
                  },
                },
              },
            },
            include: { location: true, productVariant: true },
            take: 200,
          });

          for (let i = 0; i < fastMovingItems.length; i++) {
            const item = fastMovingItems[i];
            await tx.cycleCountTask.create({
              data: {
                campaignId: campaign.id,
                locationId: item.locationId,
                productVariantId: item.productVariantId,
                taskNumber: `CC-${new Date().getFullYear()}-${campaign.id.slice(
                  -3
                )}-${String(i + 1).padStart(3, "0")}`,
                countType: campaign.countType,
                systemQuantity: item.quantityOnHand,
                tolerancePercentage: tolerance,
              },
            });
            taskCount++;
          }
        } else if (countType === "SLOW_MOVING") {
          // Find items not counted recently or with no recent sales
          const dateFilter = lastCountedBefore
            ? new Date(lastCountedBefore)
            : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

          const slowMovingItems = await tx.inventory.findMany({
            where: {
              quantityOnHand: { gt: 0 },
              OR: [{ lastCounted: { lt: dateFilter } }, { lastCounted: null }],
            },
            include: { location: true, productVariant: true },
            take: 200,
          });

          for (let i = 0; i < slowMovingItems.length; i++) {
            const item = slowMovingItems[i];
            await tx.cycleCountTask.create({
              data: {
                campaignId: campaign.id,
                locationId: item.locationId,
                productVariantId: item.productVariantId,
                taskNumber: `CC-${new Date().getFullYear()}-${campaign.id.slice(
                  -3
                )}-${String(i + 1).padStart(3, "0")}`,
                countType: campaign.countType,
                systemQuantity: item.quantityOnHand,
                tolerancePercentage: tolerance,
              },
            });
            taskCount++;
          }
        } else if (countType === "HIGH_VALUE") {
          // High value items based on total value (quantity * price)
          const highValueItems = await tx.inventory.findMany({
            where: {
              quantityOnHand: { gt: 0 },
              productVariant: {
                sellingPrice: { not: null },
              },
            },
            include: { location: true, productVariant: true },
            take: 500,
          });

          // Filter by total value and sort
          const itemsWithValue = highValueItems
            .map((item) => ({
              ...item,
              totalValue:
                item.quantityOnHand *
                Number(item.productVariant.sellingPrice || 0),
            }))
            .filter((item) => item.totalValue >= 500) // $500+ total value
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 100); // Top 100 high-value items

          for (let i = 0; i < itemsWithValue.length; i++) {
            const item = itemsWithValue[i];
            await tx.cycleCountTask.create({
              data: {
                campaignId: campaign.id,
                locationId: item.locationId,
                productVariantId: item.productVariantId,
                taskNumber: `CC-${new Date().getFullYear()}-${campaign.id.slice(
                  -3
                )}-${String(i + 1).padStart(3, "0")}`,
                countType: campaign.countType,
                systemQuantity: item.quantityOnHand,
                tolerancePercentage: tolerance,
                notes: `High value item: $${item.totalValue.toFixed(
                  2
                )} total value`,
              },
            });
            taskCount++;
          }
        } else {
          // For unimplemented count types, create a placeholder task
          const firstLocation = await tx.location.findFirst();
          if (!firstLocation) {
            throw new Error(
              "No locations found. Cannot create cycle count tasks."
            );
          }

          await tx.cycleCountTask.create({
            data: {
              campaignId: campaign.id,
              locationId: firstLocation.id,
              taskNumber: `CC-${new Date().getFullYear()}-${campaign.id.slice(
                -3
              )}-001`,
              countType: campaign.countType,
              systemQuantity: 0,
              tolerancePercentage: tolerance,
              notes: `${countType} count type - manual task creation required`,
            },
          });
          taskCount = 1;
        }

        // Update campaign with actual task count
        await tx.cycleCountCampaign.update({
          where: { id: campaign.id },
          data: { totalTasks: taskCount },
        });
      });

      return NextResponse.json(
        {
          ...campaign,
          totalTasks: taskCount,
          message: `Campaign created successfully with ${taskCount} tasks`,
        },
        { status: 201 }
      );
    } catch (taskError) {
      // Clean up campaign if task creation fails
      await prisma.cycleCountCampaign.delete({
        where: { id: campaign.id },
      });
      console.error("Error creating tasks:", taskError);
      throw new Error("Failed to create cycle count tasks");
    }
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}

// Dashboard statistics calculation function
async function calculateDashboardStats(productVariantId?: string | null) {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build where clause for product filtering
    const productFilter = productVariantId
      ? {
          tasks: {
            some: {
              productVariantId: productVariantId,
            },
          },
        }
      : {};

    const taskProductFilter = productVariantId
      ? { productVariantId: productVariantId }
      : {};

    // Use Promise.all for better performance
    const [
      totalCampaigns,
      activeCampaigns,
      completedThisWeek,
      pendingReviews,
      totalVariances,
      completedTasks,
    ] = await Promise.all([
      prisma.cycleCountCampaign.count({
        where: productFilter,
      }),

      prisma.cycleCountCampaign.count({
        where: {
          status: "ACTIVE",
          ...productFilter,
        },
      }),

      prisma.cycleCountCampaign.count({
        where: {
          status: "COMPLETED",
          endDate: { gte: weekAgo },
          ...productFilter,
        },
      }),

      prisma.cycleCountTask.count({
        where: {
          OR: [{ status: "VARIANCE_REVIEW" }, { status: "RECOUNT_REQUIRED" }],
          ...taskProductFilter,
        },
      }),

      prisma.cycleCountTask.count({
        where: {
          AND: [
            { variance: { not: null } },
            { variance: { not: 0 } },
            { completedAt: { gte: monthAgo } },
          ],
          ...taskProductFilter,
        },
      }),

      prisma.cycleCountTask.findMany({
        where: {
          status: "COMPLETED",
          completedAt: { gte: monthAgo },
          variance: { not: null },
          ...taskProductFilter,
        },
        select: {
          systemQuantity: true,
          variance: true,
        },
      }),
    ]);

    // Calculate accuracy
    let averageAccuracy = 100;
    if (completedTasks.length > 0) {
      const totalAccuracy = completedTasks.reduce((sum, task) => {
        const accuracy =
          task.systemQuantity > 0
            ? Math.max(
                0,
                100 - (Math.abs(task.variance || 0) / task.systemQuantity) * 100
              )
            : 100;
        return sum + accuracy;
      }, 0);
      averageAccuracy = totalAccuracy / completedTasks.length;
    }

    // Get monthly task counts
    const monthlyTaskStats = await prisma.cycleCountTask.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: monthAgo },
        ...taskProductFilter,
      },
      _count: true,
    });

    const tasksThisMonth = monthlyTaskStats.reduce(
      (sum, stat) => sum + stat._count,
      0
    );
    const completedThisMonth = monthlyTaskStats
      .filter((stat) => ["COMPLETED", "SKIPPED"].includes(stat.status))
      .reduce((sum, stat) => sum + stat._count, 0);

    return {
      totalCampaigns,
      activeCampaigns,
      completedThisWeek,
      averageAccuracy: Math.round(averageAccuracy * 10) / 10,
      totalVariances,
      pendingReviews,
      tasksCompletedThisMonth: completedThisMonth,
      totalTasksThisMonth: tasksThisMonth,
      averageVariancesPerCampaign:
        totalCampaigns > 0 ? totalVariances / totalCampaigns : 0,
    };
  } catch (error) {
    console.error("Error calculating dashboard stats:", error);
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
