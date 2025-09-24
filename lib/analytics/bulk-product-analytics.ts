// lib/analytics/bulk-product-analytics.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface BulkAnalyticsResult {
  productVariantId: string;
  sku: string;
  name: string;
  monthlyMovement: number;
  turnoverRate: number;
  daysSinceLastSale: number;
  profitMargin?: number;
  currentStock: number;
  avgMonthlySales: number;
  stockoutRisk: "HIGH" | "MEDIUM" | "LOW";
}

export async function getBulkProductAnalytics(): Promise<
  BulkAnalyticsResult[]
> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get all product variants with their sales data
  const productVariants = await prisma.productVariant.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      costPrice: true,
      sellingPrice: true,
      inventory: {
        select: {
          quantityOnHand: true,
          quantityReserved: true,
        },
      },
      inventoryTransactions: {
        where: {
          transactionType: "SALE",
          createdAt: {
            gte: threeMonthsAgo,
          },
        },
        select: {
          quantityChange: true,
          createdAt: true,
        },
      },
    },
  });

  const analytics: BulkAnalyticsResult[] = [];

  for (const variant of productVariants) {
    const currentStock = variant.inventory.reduce(
      (sum, inv) => sum + inv.quantityOnHand,
      0
    );
    const reservedStock = variant.inventory.reduce(
      (sum, inv) => sum + inv.quantityReserved,
      0
    );
    const availableStock = currentStock - reservedStock;

    // Calculate monthly movement
    const recentSales = variant.inventoryTransactions.filter(
      (t) => t.createdAt >= thirtyDaysAgo
    );
    const monthlyMovement = Math.abs(
      recentSales.reduce((sum, t) => sum + t.quantityChange, 0)
    );

    // Calculate 3-month average for better trend analysis
    const threeMonthSales = Math.abs(
      variant.inventoryTransactions.reduce(
        (sum, t) => sum + t.quantityChange,
        0
      )
    );
    const avgMonthlySales = threeMonthSales / 3;

    // Calculate turnover rate (annualized)
    const turnoverRate =
      currentStock > 0 ? (avgMonthlySales * 12) / currentStock : 0;

    // Days since last sale
    const lastSale = variant.inventoryTransactions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];

    const daysSinceLastSale = lastSale
      ? Math.floor(
          (now.getTime() - lastSale.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;

    // Profit margin
    let profitMargin: number | undefined;
    if (variant.costPrice && variant.sellingPrice) {
      const cost = Number(variant.costPrice);
      const selling = Number(variant.sellingPrice);
      profitMargin = ((selling - cost) / selling) * 100;
    }

    // Stock-out risk assessment
    let stockoutRisk: "HIGH" | "MEDIUM" | "LOW" = "LOW";
    if (avgMonthlySales > 0) {
      const daysOfStock = availableStock / (avgMonthlySales / 30);
      if (daysOfStock < 7) {
        stockoutRisk = "HIGH";
      } else if (daysOfStock < 30) {
        stockoutRisk = "MEDIUM";
      }
    } else if (availableStock === 0) {
      stockoutRisk = "HIGH";
    }

    analytics.push({
      productVariantId: variant.id,
      sku: variant.sku,
      name: variant.name,
      monthlyMovement,
      turnoverRate: Number(turnoverRate.toFixed(1)),
      daysSinceLastSale,
      profitMargin,
      currentStock,
      avgMonthlySales: Number(avgMonthlySales.toFixed(1)),
      stockoutRisk,
    });
  }

  return analytics.sort((a, b) => b.monthlyMovement - a.monthlyMovement);
}

// Dashboard summary analytics
export async function getDashboardAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalProducts,
    lowStockCount,
    totalOrders,
    totalRevenue,
    topSellingProducts,
  ] = await Promise.all([
    // Total active products
    prisma.productVariant.count(),

    // Low stock items (less than 10 units)
    prisma.inventory.count({
      where: {
        quantityOnHand: {
          lt: 10,
        },
      },
    }),

    // Orders this month
    prisma.order.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),

    // Revenue this month
    prisma.order.aggregate({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
        status: {
          in: ["SHIPPED", "DELIVERED", "FULFILLED"],
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),

    // Top 5 selling products this month
    prisma.inventoryTransaction.groupBy({
      by: ["productVariantId"],
      where: {
        transactionType: "SALE",
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        quantityChange: true,
      },
      orderBy: {
        _sum: {
          quantityChange: "asc", // Most negative = most sold
        },
      },
      take: 5,
    }),
  ]);

  return {
    totalProducts,
    lowStockCount,
    totalOrders,
    totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
    topSellingProducts: topSellingProducts.map((p) => ({
      productVariantId: p.productVariantId,
      quantitySold: Math.abs(p._sum.quantityChange || 0),
    })),
  };
}
