// components/product/RecentTransactionsCard.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  History,
  Loader2,
  Plus,
  Minus,
  ArrowRightLeft,
  Package,
  ShoppingCart,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useProductTransactions } from "@/hooks/useProductTransactions";

interface RecentTransactionsCardProps {
  productVariantId: string;
}

function getTransactionIcon(transactionType: string) {
  const iconClass = "w-4 h-4 mr-2";

  switch (transactionType) {
    case "RECEIPT":
      return <Plus className={`${iconClass} text-green-600`} />;
    case "SALE":
      return <Minus className={`${iconClass} text-red-600`} />;
    case "ADJUSTMENT":
      return <Settings className={`${iconClass} text-blue-600`} />;
    case "TRANSFER":
      return <ArrowRightLeft className={`${iconClass} text-purple-600`} />;
    case "ALLOCATION":
      return <Package className={`${iconClass} text-orange-600`} />;
    case "DEALLOCATION":
      return <Package className={`${iconClass} text-gray-600`} />;
    case "COUNT":
      return <Settings className={`${iconClass} text-indigo-600`} />;
    default:
      return <History className={`${iconClass} text-gray-600`} />;
  }
}

function formatTransactionType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function RecentTransactionsCard({
  productVariantId,
}: RecentTransactionsCardProps) {
  const router = useRouter();
  const {
    data: transactions,
    isLoading,
    error,
  } = useProductTransactions(productVariantId, 10);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="w-5 h-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            Failed to load transaction history
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <History className="w-5 h-5 mr-2" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  {getTransactionIcon(transaction.type)}
                  <div className="ml-2">
                    <div className="text-sm font-medium">
                      {formatTransactionType(transaction.type)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                    {transaction.notes && (
                      <div className="text-xs text-muted-foreground italic">
                        {transaction.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-medium ${
                      transaction.quantityChange > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.quantityChange > 0 ? "+" : ""}
                    {transaction.quantityChange}
                  </div>
                  {transaction.userName && (
                    <div className="text-xs text-muted-foreground">
                      {transaction.userName}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {transactions.length > 5 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() =>
                  router.push(
                    `/dashboard/inventory/transactions?product=${productVariantId}`
                  )
                }
              >
                View All Transactions ({transactions.length})
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No transaction history found
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
