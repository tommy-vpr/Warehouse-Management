// components/product/ProductAnalyticsCard.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart3, Loader2 } from "lucide-react";
import { useProductAnalytics } from "@/hooks/useProductAnalytics";

interface ProductAnalyticsCardProps {
  productVariantId: string;
}

export function ProductAnalyticsCard({
  productVariantId,
}: ProductAnalyticsCardProps) {
  const {
    data: analytics,
    isLoading,
    error,
  } = useProductAnalytics(productVariantId);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            Failed to load analytics data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Monthly Movement
                </span>
                <span className="font-medium">
                  {analytics?.monthlyMovement || 0}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Turnover Rate
                </span>
                <span className="font-medium">
                  {analytics?.turnoverRate || 0}x
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Days Since Last Sale
                </span>
                <span
                  className={`font-medium ${
                    analytics?.daysSinceLastSale &&
                    analytics.daysSinceLastSale > 90
                      ? "text-destructive"
                      : analytics?.daysSinceLastSale &&
                        analytics.daysSinceLastSale > 30
                      ? "text-yellow-600"
                      : "text-foreground"
                  }`}
                >
                  {analytics?.daysSinceLastSale === 999
                    ? "Never"
                    : analytics?.daysSinceLastSale || 0}
                </span>
              </div>
            </div>

            {analytics?.profitMargin !== undefined && (
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Profit Margin
                  </span>
                  <span
                    className={`font-medium ${
                      analytics.profitMargin < 20
                        ? "text-destructive"
                        : analytics.profitMargin > 40
                        ? "text-green-600"
                        : "text-foreground"
                    }`}
                  >
                    {analytics.profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
