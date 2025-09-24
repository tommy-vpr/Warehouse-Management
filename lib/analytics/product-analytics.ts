// lib/analytics/product-analytics.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface ProductAnalytics {
  monthlyMovement: number;
  turnoverRate: number;
  daysSinceLastSale: number;
  profitMargin?: number;
}

export async function getProductAnalytics(
  productVariantId: string
): Promise<ProductAnalytics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Get product variant with pricing info
  const productVariant = await prisma.productVariant.findUnique({
    where: { id: productVariantId },
    select: {
      costPrice: true,
      sellingPrice: true,
    },
  });

  // 1. Monthly Movement - Total quantity sold in last 30 days
  const monthlyMovement = await prisma.inventoryTransaction.aggregate({
    where: {
      productVariantId,
      transactionType: "SALE",
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    _sum: {
      quantityChange: true,
    },
  });

  // 2. Calculate average inventory for turnover rate
  const currentInventory = await prisma.inventory.aggregate({
    where: {
      productVariantId,
    },
    _sum: {
      quantityOnHand: true,
    },
  });

  // Get yearly sales for turnover calculation
  const yearlySales = await prisma.inventoryTransaction.aggregate({
    where: {
      productVariantId,
      transactionType: "SALE",
      createdAt: {
        gte: oneYearAgo,
      },
    },
    _sum: {
      quantityChange: true,
    },
  });

  // 3. Days since last sale
  const lastSale = await prisma.inventoryTransaction.findFirst({
    where: {
      productVariantId,
      transactionType: "SALE",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
    },
  });

  // Calculate metrics
  const monthlyMovementValue = Math.abs(
    monthlyMovement._sum.quantityChange || 0
  );

  const averageInventory = currentInventory._sum.quantityOnHand || 1; // Avoid division by zero
  const yearlyMovement = Math.abs(yearlySales._sum.quantityChange || 0);
  const turnoverRate = yearlyMovement / averageInventory;

  const daysSinceLastSale = lastSale
    ? Math.floor(
        (now.getTime() - lastSale.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : 999; // Large number if never sold

  // 4. Profit margin calculation
  let profitMargin: number | undefined;
  if (productVariant?.costPrice && productVariant?.sellingPrice) {
    const cost = Number(productVariant.costPrice);
    const selling = Number(productVariant.sellingPrice);
    profitMargin = ((selling - cost) / selling) * 100;
  }

  return {
    monthlyMovement: monthlyMovementValue,
    turnoverRate: Number(turnoverRate.toFixed(1)),
    daysSinceLastSale,
    profitMargin,
  };
}
