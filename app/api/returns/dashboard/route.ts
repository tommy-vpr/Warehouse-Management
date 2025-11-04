// app/api/returns/dashboard/route.ts
// API route for returns dashboard metrics

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : startOfMonth(new Date());
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : endOfMonth(new Date());

    // Get all returns in period
    const returns = await prisma.returnOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            productVariant: true,
            inspections: true,
          },
        },
      },
    });

    // Calculate metrics
    const returnCount = returns.length;

    // Get total orders in same period for return rate
    const totalOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ["SHIPPED", "DELIVERED"],
        },
      },
    });

    const returnRate = totalOrders > 0 ? (returnCount / totalOrders) * 100 : 0;

    const totalRefundAmount = returns.reduce(
      (sum, r) => sum + (Number(r.refundAmount) || 0),
      0
    );

    const averageRefundAmount =
      returnCount > 0 ? totalRefundAmount / returnCount : 0;

    // Calculate average processing time
    const completedReturns = returns.filter((r) => r.status === "CLOSED");
    const avgProcessingDays =
      completedReturns.length > 0
        ? completedReturns.reduce((sum, r) => {
            const days = Math.floor(
              (new Date(r.updatedAt).getTime() -
                new Date(r.createdAt).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / completedReturns.length
        : 0;

    // Group by reason
    const byReason = Object.entries(
      returns.reduce((acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([reason, count]) => ({
      reason,
      count,
      percentage: (count / returnCount) * 100,
    }));

    // Group by condition (from inspections)
    const allInspections = returns.flatMap((r) =>
      r.items.flatMap((item) => item.inspections)
    );

    const byCondition = Object.entries(
      allInspections.reduce((acc, i) => {
        acc[i.condition] = (acc[i.condition] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([condition, count]) => ({
      condition,
      count,
      percentage: (count / allInspections.length) * 100,
    }));

    // Restocking metrics
    const totalReceived = returns.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + i.quantityReceived, 0),
      0
    );
    const totalRestocked = returns.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + i.quantityRestockable, 0),
      0
    );
    const totalDisposed = returns.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + i.quantityDisposed, 0),
      0
    );
    const restockRate =
      totalReceived > 0 ? (totalRestocked / totalReceived) * 100 : 0;

    const metrics = {
      period: {
        start: startDate,
        end: endDate,
      },
      totals: {
        returnCount,
        returnRate,
        totalRefundAmount,
        averageRefundAmount,
        averageProcessingDays: avgProcessingDays,
      },
      byReason,
      byCondition,
      restockingMetrics: {
        totalReceived,
        totalRestocked,
        totalDisposed,
        restockRate,
      },
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching return metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch return metrics" },
      { status: 500 }
    );
  }
}
