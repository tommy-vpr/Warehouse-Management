// lib/audit-trail-utils.ts
import type { AuditEvent, AuditSummary } from "@/types/audit-trail";

/**
 * Format event type for display
 */
export function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, " ").toLowerCase();
}

/**
 * Get human-readable label for event type
 */
export function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    // Status
    PENDING_TO_ALLOCATED: "Order Allocated",
    ALLOCATED_TO_PICKING: "Started Picking",
    PICKING_TO_PICKED: "Picking Complete",
    PICKED_TO_PACKED: "Packing Complete",
    PACKED_TO_SHIPPED: "Order Shipped",

    // Picking
    PICK_STARTED: "Pick Started",
    PICK_COMPLETED: "Pick Completed",
    PICK_PAUSED: "Pick Paused",
    PICK_RESUMED: "Pick Resumed",
    PICK_CANCELLED: "Pick Cancelled",
    PICK_REASSIGNED: "Pick Reassigned",
    LOCATION_SCANNED: "Location Scanned",
    BARCODE_SCANNED: "Barcode Scanned",
    ITEM_PICKED: "Item Picked",
    ITEM_SHORT_PICKED: "Item Short Picked",
    ITEM_SKIPPED: "Item Skipped",

    // Tasks
    TASK_CREATED: "Task Created",
    TASK_ASSIGNED: "Task Assigned",
    TASK_STARTED: "Task Started",
    TASK_COMPLETED: "Task Completed",
    TASK_PAUSED: "Task Paused",
    TASK_RESUMED: "Task Resumed",
    TASK_CANCELLED: "Task Cancelled",
    TASK_REASSIGNED: "Task Reassigned",
    ITEM_COMPLETED: "Item Completed",

    // Shipping
    LABEL_CREATED: "Label Created",
    ORDER_SHIPPED: "Order Shipped",

    // Back Orders
    CREATED: "Back Order Created",
    FULFILLED: "Back Order Fulfilled",
  };

  return labels[eventType] || formatEventType(eventType);
}

/**
 * Get color class for event category
 */
export function getEventCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    ORDER_STATUS: "blue",
    PICKING: "purple",
    PACKING: "amber",
    SHIPPING: "green",
    BACK_ORDER: "red",
    QUALITY_CHECK: "indigo",
  };

  return colors[category] || "gray";
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(
  timestamp: string,
  format: "full" | "short" | "relative" = "full"
): string {
  const date = new Date(timestamp);

  if (format === "relative") {
    return formatRelativeTime(date);
  }

  if (format === "short") {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    return date.toLocaleDateString();
  }
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  }
  if (diffSeconds > 10) {
    return `${diffSeconds} seconds ago`;
  }
  return "just now";
}

/**
 * Group events by category
 */
export function groupEventsByCategory(
  events: AuditEvent[]
): Map<string, AuditEvent[]> {
  const groups = new Map<string, AuditEvent[]>();

  events.forEach((event) => {
    const category = event.type;
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(event);
  });

  return groups;
}

/**
 * Group events by date
 */
export function groupEventsByDate(
  events: AuditEvent[]
): Map<string, AuditEvent[]> {
  const groups = new Map<string, AuditEvent[]>();

  events.forEach((event) => {
    const date = new Date(event.timestamp);
    const dateKey = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(event);
  });

  return groups;
}

/**
 * Filter events by category
 */
export function filterEventsByCategory(
  events: AuditEvent[],
  category: string | null
): AuditEvent[] {
  if (!category) return events;
  return events.filter((event) => event.type === category);
}

/**
 * Filter events by event type
 */
export function filterEventsByEventType(
  events: AuditEvent[],
  eventType: string | null
): AuditEvent[] {
  if (!eventType) return events;
  return events.filter((event) => event.eventType === eventType);
}

/**
 * Filter events by user
 */
export function filterEventsByUser(
  events: AuditEvent[],
  userId: string | null
): AuditEvent[] {
  if (!userId) return events;
  return events.filter((event) => event.user?.id === userId);
}

/**
 * Filter events by date range
 */
export function filterEventsByDateRange(
  events: AuditEvent[],
  startDate: Date | null,
  endDate: Date | null
): AuditEvent[] {
  return events.filter((event) => {
    const eventDate = new Date(event.timestamp);
    if (startDate && eventDate < startDate) return false;
    if (endDate && eventDate > endDate) return false;
    return true;
  });
}

/**
 * Search events by text
 */
export function searchEvents(
  events: AuditEvent[],
  query: string
): AuditEvent[] {
  if (!query) return events;

  const lowerQuery = query.toLowerCase();

  return events.filter((event) => {
    // Search in event type
    if (event.eventType?.toLowerCase().includes(lowerQuery)) return true;

    // Search in user name/email
    if (event.user?.name?.toLowerCase().includes(lowerQuery)) return true;
    if (event.user?.email?.toLowerCase().includes(lowerQuery)) return true;

    // Search in notes
    if (event.notes?.toLowerCase().includes(lowerQuery)) return true;

    // Search in metadata
    const metadataStr = JSON.stringify(event.metadata).toLowerCase();
    if (metadataStr.includes(lowerQuery)) return true;

    return false;
  });
}

/**
 * Calculate event statistics
 */
export function calculateEventStats(events: AuditEvent[]): {
  totalEvents: number;
  uniqueUsers: number;
  averageEventsPerHour: number;
  mostActiveUser: { name: string; count: number } | null;
  mostCommonEventType: { type: string; count: number } | null;
} {
  const userCounts = new Map<string, number>();
  const eventTypeCounts = new Map<string, number>();

  events.forEach((event) => {
    // Count by user
    if (event.user?.id) {
      const userId = event.user.id;
      userCounts.set(userId, (userCounts.get(userId) || 0) + 1);
    }

    // Count by event type
    if (event.eventType) {
      const eventType = event.eventType;
      eventTypeCounts.set(eventType, (eventTypeCounts.get(eventType) || 0) + 1);
    }
  });

  // Find most active user
  let mostActiveUser: { name: string; count: number } | null = null;
  let maxUserCount = 0;
  events.forEach((event) => {
    if (event.user?.id) {
      const count = userCounts.get(event.user.id) || 0;
      if (count > maxUserCount) {
        maxUserCount = count;
        mostActiveUser = {
          name: event.user.name || event.user.email,
          count,
        };
      }
    }
  });

  // Find most common event type
  let mostCommonEventType: { type: string; count: number } | null = null;
  let maxEventTypeCount = 0;
  eventTypeCounts.forEach((count, type) => {
    if (count > maxEventTypeCount) {
      maxEventTypeCount = count;
      mostCommonEventType = { type, count };
    }
  });

  // Calculate average events per hour
  let averageEventsPerHour = 0;
  if (events.length > 1) {
    const sorted = [...events].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const firstEvent = new Date(sorted[0].timestamp);
    const lastEvent = new Date(sorted[sorted.length - 1].timestamp);
    const durationHours =
      (lastEvent.getTime() - firstEvent.getTime()) / (1000 * 60 * 60);
    if (durationHours > 0) {
      averageEventsPerHour = events.length / durationHours;
    }
  }

  return {
    totalEvents: events.length,
    uniqueUsers: userCounts.size,
    averageEventsPerHour: Math.round(averageEventsPerHour * 10) / 10,
    mostActiveUser,
    mostCommonEventType,
  };
}

/**
 * Export events to CSV
 */
export function exportEventsToCSV(events: AuditEvent[]): string {
  const headers = [
    "Timestamp",
    "Category",
    "Event Type",
    "User",
    "User Email",
    "Notes",
    "Metadata",
  ];

  const rows = events.map((event) => [
    event.timestamp,
    event.type,
    event.eventType || "",
    event.user?.name || "",
    event.user?.email || "",
    event.notes || "",
    JSON.stringify(event.metadata),
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csv;
}

/**
 * Download CSV file
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
