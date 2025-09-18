// lib/types/cycle-count.ts
export interface CycleCountTask {
  id: string;
  campaignId?: string;
  taskNumber: string;
  locationId: string;
  productVariantId?: string;

  // Task details
  priority: number;
  status: TaskStatus;
  countType: CycleCountType;

  // Quantities
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  variancePercentage?: number;

  // Assignment and timing
  assignedTo?: string;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Additional details
  notes?: string;
  tolerancePercentage?: number;
  requiresRecount: boolean;
  recountReason?: string;

  // Relations
  location: {
    id: string;
    name: string;
    zone?: string;
    aisle?: string;
    shelf?: string;
    bin?: string;
  };
  productVariant?: {
    id: string;
    sku: string;
    name: string;
    upc?: string;
    product: {
      id: string;
      name: string;
    };
  };
  assignedUser?: {
    id: string;
    name: string;
    email: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface CycleCountCampaign {
  id: string;
  name: string;
  description?: string;
  countType: CycleCountType;
  status: CampaignStatus;
  startDate: Date;
  endDate?: Date;
  frequency?: CountFrequency;

  // Criteria
  locationIds: string[];
  zoneFilter?: string;
  abcClass?: string;
  lastCountedBefore?: Date;

  // Progress
  totalTasks: number;
  completedTasks: number;
  variancesFound: number;

  // Relations
  tasks: CycleCountTask[];

  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VARIANCE_REVIEW"
  | "RECOUNT_REQUIRED"
  | "SKIPPED"
  | "CANCELLED";

export type CycleCountType =
  | "FULL"
  | "PARTIAL"
  | "ABC_ANALYSIS"
  | "FAST_MOVING"
  | "SLOW_MOVING"
  | "NEGATIVE_STOCK"
  | "ZERO_STOCK"
  | "HIGH_VALUE"
  | "DAMAGED_LOCATION";

export type CampaignStatus =
  | "PLANNED"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export type CountFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUALLY"
  | "AD_HOC";

// lib/cycle-count-utils.ts
export class CycleCountUtils {
  /**
   * Calculate variance percentage between system and counted quantities
   */
  static calculateVariancePercentage(
    systemQty: number,
    countedQty: number
  ): number {
    if (systemQty === 0 && countedQty === 0) return 0;
    if (systemQty === 0) return 100;

    return Math.abs((countedQty - systemQty) / systemQty) * 100;
  }

  /**
   * Determine if variance exceeds tolerance
   */
  static exceedsTolerance(
    variance: number,
    systemQty: number,
    tolerance: number = 5
  ): boolean {
    const variancePercentage = this.calculateVariancePercentage(
      systemQty,
      systemQty + variance
    );
    return variancePercentage > tolerance;
  }

  /**
   * Calculate accuracy percentage for a task
   */
  static calculateAccuracy(systemQty: number, countedQty: number): number {
    const variancePercentage = this.calculateVariancePercentage(
      systemQty,
      countedQty
    );
    return Math.max(0, 100 - variancePercentage);
  }

  /**
   * Generate next cycle count batch number
   */
  static async generateBatchNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CC-${year}-`;

    // Find the highest existing batch number for this year
    const lastTask = await prisma.cycleCountTask.findFirst({
      where: {
        taskNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        taskNumber: "desc",
      },
    });

    let nextNumber = 1;
    if (lastTask) {
      const lastNumber = parseInt(lastTask.taskNumber.replace(prefix, ""));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(3, "0")}`;
  }

  /**
   * Determine priority based on count type and other factors
   */
  static calculatePriority(
    countType: CycleCountType,
    lastCountedDays?: number,
    value?: number
  ): number {
    let priority = 0;

    // Base priority by count type
    switch (countType) {
      case "NEGATIVE_STOCK":
        priority += 100;
        break;
      case "HIGH_VALUE":
        priority += 80;
        break;
      case "FAST_MOVING":
        priority += 60;
        break;
      case "ABC_ANALYSIS":
        priority += 40;
        break;
      case "SLOW_MOVING":
        priority += 20;
        break;
      default:
        priority += 30;
    }

    // Age factor
    if (lastCountedDays) {
      if (lastCountedDays > 365) priority += 50;
      else if (lastCountedDays > 180) priority += 30;
      else if (lastCountedDays > 90) priority += 10;
    }

    // Value factor
    if (value) {
      if (value > 10000) priority += 30;
      else if (value > 1000) priority += 20;
      else if (value > 100) priority += 10;
    }

    return Math.min(priority, 999); // Cap at 999
  }

  /**
   * Get status color for UI components
   */
  static getStatusColor(status: TaskStatus): string {
    switch (status) {
      case "PENDING":
        return "bg-gray-100 text-gray-800";
      case "ASSIGNED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "VARIANCE_REVIEW":
        return "bg-orange-100 text-orange-800";
      case "RECOUNT_REQUIRED":
        return "bg-red-100 text-red-800";
      case "SKIPPED":
        return "bg-purple-100 text-purple-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  /**
   * Get priority color for UI components
   */
  static getPriorityColor(priority: number): string {
    if (priority >= 80) return "bg-red-100 text-red-800";
    if (priority >= 50) return "bg-orange-100 text-orange-800";
    if (priority >= 30) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  }

  /**
   * Format variance for display
   */
  static formatVariance(variance: number): string {
    return variance > 0 ? `+${variance}` : variance.toString();
  }

  /**
   * Create cycle count tasks from criteria
   */
  static async createTasksFromCriteria(criteria: {
    countType: CycleCountType;
    locationIds?: string[];
    zoneFilter?: string;
    lastCountedBefore?: Date;
    abcClass?: string;
    campaignId?: string;
  }): Promise<string[]> {
    const taskIds: string[] = [];

    // Build where clause for inventory selection
    const inventoryWhere: any = {};

    if (criteria.locationIds?.length) {
      inventoryWhere.locationId = { in: criteria.locationIds };
    }

    if (criteria.zoneFilter) {
      inventoryWhere.location = {
        zone: criteria.zoneFilter,
      };
    }

    if (criteria.lastCountedBefore) {
      inventoryWhere.OR = [
        { lastCounted: null },
        { lastCounted: { lt: criteria.lastCountedBefore } },
      ];
    }

    // Special logic for different count types
    switch (criteria.countType) {
      case "NEGATIVE_STOCK":
        inventoryWhere.quantityOnHand = { lt: 0 };
        break;
      case "ZERO_STOCK":
        inventoryWhere.quantityOnHand = { equals: 0 };
        break;
      case "FAST_MOVING":
        // Add logic for fast-moving items based on transaction history
        break;
    }

    // Get inventory items that match criteria
    const inventoryItems = await prisma.inventory.findMany({
      where: inventoryWhere,
      include: {
        productVariant: {
          include: { product: true },
        },
        location: true,
      },
    });

    // Create tasks for each inventory item
    for (const item of inventoryItems) {
      const taskNumber = await this.generateBatchNumber();
      const priority = this.calculatePriority(
        criteria.countType,
        item.lastCounted
          ? Math.floor(
              (Date.now() - item.lastCounted.getTime()) / (1000 * 60 * 60 * 24)
            )
          : undefined
      );

      const task = await prisma.cycleCountTask.create({
        data: {
          campaignId: criteria.campaignId,
          taskNumber,
          locationId: item.locationId,
          productVariantId: item.productVariantId,
          countType: criteria.countType,
          systemQuantity: item.quantityOnHand,
          priority,
          status: "PENDING",
        },
      });

      taskIds.push(task.id);
    }

    return taskIds;
  }
}

// lib/hooks/use-cycle-count.ts
import { useState, useEffect } from "react";

export function useCycleCount(taskId: string) {
  const [task, setTask] = useState<CycleCountTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/inventory/cycle-counts/${taskId}`);

      if (!response.ok) {
        throw new Error("Failed to load task");
      }

      const data = await response.json();
      setTask(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const recordCount = async (countedQuantity: number, notes?: string) => {
    try {
      const response = await fetch(
        `/api/inventory/cycle-counts/${taskId}/count`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ countedQuantity, notes }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to record count");
      }

      await loadTask(); // Reload task data
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record count");
      throw err;
    }
  };

  const skipTask = async (reason?: string) => {
    try {
      const response = await fetch(
        `/api/inventory/cycle-counts/${taskId}/count`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            countedQuantity: null,
            notes: reason,
            status: "SKIPPED",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to skip task");
      }

      await loadTask();
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip task");
      throw err;
    }
  };

  return {
    task,
    isLoading,
    error,
    recordCount,
    skipTask,
    reload: loadTask,
  };
}
