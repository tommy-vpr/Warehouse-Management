// utils/cycle-count-analytics.ts
export interface CampaignAnalytics {
  campaign: {
    accuracy: number;
    totalValue: number;
    varianceValue: number;
    varianceValuePercentage: number;
  };
  counts: {
    total: number;
    completed: number;
    variances: number;
    positive: number;
    negative: number;
    high: number;
    skipped: number;
  };
  locationStats: Record<
    string,
    {
      total: number;
      completed: number;
      variances: number;
      accuracy: number;
    }
  >;
  topVarianceItems: any[];
}

export function calculateCampaignAnalytics(campaign: any): CampaignAnalytics {
  const tasks = campaign.tasks;
  // Completed = only tasks actually finished counting
  const completedTasks = tasks.filter((t: any) => t.status === "COMPLETED");

  // Skipped tasks separate
  const skippedTasks = tasks.filter((t: any) => t.status === "SKIPPED");

  const varianceTasks = completedTasks.filter(
    (t: any) =>
      t.countedQuantity !== null && t.variance !== null && t.variance !== 0
  );

  // Accuracy should only use completed
  const accuracy =
    completedTasks.length > 0
      ? ((completedTasks.length - varianceTasks.length) /
          completedTasks.length) *
        100
      : 100;

  // Variance analysis
  const positiveVariances = completedTasks.filter(
    (t: any) => (t.variance || 0) > 0
  );
  const negativeVariances = completedTasks.filter(
    (t: any) => (t.variance || 0) < 0
  );
  const highVariances = completedTasks.filter(
    (t: any) => Math.abs(t.variancePercentage || 0) > 10
  );

  // Location analysis
  const locationStats = completedTasks.reduce((acc: any, task: any) => {
    const locationName = task.location.name;
    if (!acc[locationName]) {
      acc[locationName] = {
        total: 0,
        completed: 0,
        variances: 0,
        accuracy: 0,
      };
    }

    acc[locationName].total++;
    acc[locationName].completed++;

    if (task.variance !== null && task.variance !== 0) {
      acc[locationName].variances++;
    }

    acc[locationName].accuracy =
      acc[locationName].completed > 0
        ? ((acc[locationName].completed - acc[locationName].variances) /
            acc[locationName].completed) *
          100
        : 100;

    return acc;
  }, {});

  // Top variance items
  const topVarianceItems = tasks
    .filter((t: any) => t.variance !== null && t.variance !== 0)
    .sort(
      (a: any, b: any) =>
        Math.abs(b.variancePercentage || 0) -
        Math.abs(a.variancePercentage || 0)
    )
    .slice(0, 10);

  // Summary metrics
  const totalValue = tasks.reduce((sum: number, task: any) => {
    const price = Number(task.productVariant?.sellingPrice || 0);
    const systemQty = task.systemQuantity;
    return sum + price * systemQty;
  }, 0);

  const varianceValue = varianceTasks.reduce((sum: number, task: any) => {
    const price = Number(task.productVariant?.sellingPrice || 0);
    const variance = Math.abs(task.variance || 0);
    return sum + price * variance;
  }, 0);

  return {
    campaign: {
      accuracy,
      totalValue,
      varianceValue,
      varianceValuePercentage:
        totalValue > 0 ? (varianceValue / totalValue) * 100 : 0,
    },
    counts: {
      total: tasks.length,
      completed: completedTasks.length,
      variances: varianceTasks.length,
      positive: positiveVariances.length,
      negative: negativeVariances.length,
      high: highVariances.length,
      skipped: skippedTasks.length,
    },

    locationStats,
    topVarianceItems,
  };
}
