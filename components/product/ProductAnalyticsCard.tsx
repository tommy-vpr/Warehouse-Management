// components/ProductAnalyticsCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Activity, DollarSign } from "lucide-react";

interface ProductAnalytics {
  monthlyMovement: number;
  averageVelocity: number;
  turnoverRate: number;
  daysSinceLastSale: number;
  totalValue: number;
  profitMargin?: number;
}

interface ProductAnalyticsCardProps {
  analytics: ProductAnalytics;
  isLoading?: boolean;
}

export function ProductAnalyticsCard({
  analytics,
  isLoading,
}: ProductAnalyticsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-4 h-4 mr-2 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Monthly Movement
            </span>
          </div>
          <span className="font-semibold">{analytics.monthlyMovement}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Avg Velocity
            </span>
          </div>
          <span className="font-semibold">
            {analytics.averageVelocity.toFixed(1)}/day
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-4 h-4 mr-2 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Turnover Rate
            </span>
          </div>
          <span className="font-semibold">
            {analytics.turnoverRate.toFixed(1)}x
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-4 h-4 mr-2 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Days Since Last Sale
            </span>
          </div>
          <span className="font-semibold">
            {analytics.daysSinceLastSale >= 999
              ? "Never"
              : `${analytics.daysSinceLastSale} days`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="w-4 h-4 mr-2 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Total Value
            </span>
          </div>
          <span className="font-semibold">
            ${analytics.totalValue.toFixed(2)}
          </span>
        </div>

        {(analytics.profitMargin ?? null) !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Profit Margin
              </span>
            </div>
            <span className="font-semibold">
              {analytics.profitMargin!.toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
