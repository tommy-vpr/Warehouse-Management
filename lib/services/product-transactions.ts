// lib/services/product-transactions.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface ProductTransaction {
  id: string;
  type: string;
  quantityChange: number;
  createdAt: string;
  userName?: string;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
}

export async function getProductTransactions(
  productVariantId: string,
  limit: number = 10
): Promise<ProductTransaction[]> {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      productVariantId,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return transactions.map((transaction) => ({
    id: transaction.id,
    type: transaction.transactionType,
    quantityChange: transaction.quantityChange,
    createdAt: transaction.createdAt.toISOString(),
    userName: transaction.user?.name || undefined,
    notes: transaction.notes || undefined,
    referenceType: transaction.referenceType || undefined,
    referenceId: transaction.referenceId || undefined,
  }));
}
