// lib/activity-utils.tsx
import {
  Package,
  DollarSign,
  ShoppingCart,
  Scan,
  Truck,
  ArrowLeftRight,
  Settings,
  CheckCircle,
  XCircle,
  Bell,
} from "lucide-react";

/**
 * Get the icon component for an activity type
 */
// lib/activity-utils.tsx

export function getActivityIcon(type: string, size: number = 4) {
  const sizeClass = `w-${size} h-${size}`;

  switch (type.toLowerCase()) {
    // Legacy/Original types
    case "receipt":
      return <Package className={`${sizeClass} text-blue-500`} />;
    case "sale":
      return <DollarSign className={`${sizeClass} text-green-500`} />;
    case "order":
      return <ShoppingCart className={`${sizeClass} text-orange-500`} />;
    case "scan":
      return <Scan className={`${sizeClass} text-cyan-500`} />;
    case "shipment":
      return <Truck className={`${sizeClass} text-teal-500`} />;

    // Receiving types
    case "po_receiving":
      return <Package className={`${sizeClass} text-blue-500`} />;
    case "asn_receiving":
      return <Package className={`${sizeClass} text-blue-500`} />;
    case "transfer_receiving":
      return <ArrowLeftRight className={`${sizeClass} text-indigo-500`} />;
    case "returns":
      return <ArrowLeftRight className={`${sizeClass} text-yellow-400`} />;

    // Inventory types
    case "adjustment":
      return <Settings className={`${sizeClass} text-purple-500`} />;
    case "count":
      return <Scan className={`${sizeClass} text-cyan-500`} />;

    // Order/Allocation types
    case "allocation":
      return <CheckCircle className={`${sizeClass} text-orange-500`} />;
    case "deallocation":
      return <XCircle className={`${sizeClass} text-red-500`} />;

    // Transfer types
    case "transfer":
      return <ArrowLeftRight className={`${sizeClass} text-indigo-500`} />;

    default:
      return (
        <Bell className={`${sizeClass} text-gray-500 dark:text-blue-500`} />
      );
  }
}

/**
 * Get the badge color classes for an activity type
 */
export function getActivityBadgeColor(type: string): string {
  switch (type.toLowerCase()) {
    // Legacy/Original types
    case "receipt":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "sale":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "order":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "scan":
      return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400";
    case "shipment":
      return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400";

    // Receiving types
    case "po_receiving":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "asn_receiving":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "transfer_receiving":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "returns":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";

    // Inventory types
    case "adjustment":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "count":
      return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400";

    // Order/Allocation types
    case "allocation":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "deallocation":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";

    // Transfer types
    case "transfer":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";

    default:
      return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400";
  }
}
