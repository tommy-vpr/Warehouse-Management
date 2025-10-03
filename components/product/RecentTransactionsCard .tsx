// components/RecentTransactionsCard.tsx
import { useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import _ from "lodash";
import {
  Plus,
  Minus,
  Edit,
  ArrowRightLeft,
  Archive,
  History,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  type: string;
  quantityChange: number;
  referenceId?: string;
  referenceType?: string;
  userId?: string;
  userName?: string;
  notes?: string;
  createdAt: string;
}

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  productVariantId?: string; // Add this to create the link
  isLoading?: boolean;
}

export function RecentTransactionsCard({
  transactions,
  productVariantId,
  isLoading,
}: RecentTransactionsCardProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const router = useRouter();

  const toggleNote = (transactionId: string) => {
    setExpandedNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const truncateToWords = (text: string, wordLimit: number = 5) => {
    const words = _.words(text);
    return words.length > wordLimit
      ? _.truncate(text, {
          length: _.take(words, wordLimit).join(" ").length + 3,
          separator: " ",
        })
      : text;
  };

  console.log(transactions);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "RECEIPT":
        return <Plus className="w-4 h-4 text-green-600" />;
      case "SALE":
        return <Minus className="w-4 h-4 text-red-600" />;
      case "ADJUSTMENT":
        return <Edit className="w-4 h-4 text-blue-600" />;
      case "TRANSFER":
        return <ArrowRightLeft className="w-4 h-4 text-teal-600" />;
      case "COUNT":
        return <Archive className="w-4 h-4 text-orange-600" />;
      default:
        return <History className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case "RECEIPT":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "SALE":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "ADJUSTMENT":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "TRANSFER":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      case "COUNT":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (isLoading) {
    return (
      <>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No transactions yet</p>
          </div>
        </CardContent>
      </>
    );
  }

  const recentTransactions = transactions.slice(0, 5);
  const hasMore = transactions.length > 5;

  return (
    <>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Recent Transactions</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(
                `/dashboard/inventory/transactions?product=${productVariantId}`
              )
            }
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            View All ({transactions.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentTransactions.map((transaction) => {
            const isExpanded = expandedNotes.has(transaction.id);
            const shouldTruncate =
              transaction.notes && _.words(transaction.notes).length > 6;

            return (
              <div
                key={transaction.id}
                className="flex items-start justify-between p-3 bg-gray-100 dark:bg-zinc-900 rounded-lg"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={getTransactionBadgeColor(transaction.type)}
                      >
                        {transaction.type}
                      </Badge>
                      <span
                        className={`font-semibold ${
                          transaction.quantityChange > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {transaction.quantityChange > 0 ? "+" : ""}
                        {transaction.quantityChange}
                      </span>
                    </div>

                    {/* Timestamp with username inline */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {new Date(transaction.createdAt).toLocaleString()}
                      {transaction.userName && (
                        // <span className="ml-1">
                        //   • by {transaction.userName}
                        // </span>
                        <span className="ml-1 font-medium text-blue-600 dark:text-blue-400">
                          • by {transaction.userName}
                        </span>
                      )}
                    </p>

                    {transaction.referenceType && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Ref: {transaction.referenceType}
                        {transaction.referenceId &&
                          ` #${transaction.referenceId.slice(-8)}`}
                      </p>
                    )}

                    {transaction.notes && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <p className="break-words">
                          {isExpanded
                            ? transaction.notes
                            : truncateToWords(transaction.notes, 6)}
                        </p>
                        {shouldTruncate && (
                          <button
                            onClick={() => toggleNote(transaction.id)}
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-600 mt-1 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                Show more
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Showing 5 of {transactions.length} transactions
            </p>
          </div>
        )}
      </CardContent>
    </>
  );
}
