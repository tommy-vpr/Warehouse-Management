import { Skeleton } from "@/components/ui/skeleton";

export function PickListsTableSkeleton() {
  return (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
          {/* Batch Number */}
          <td className="px-4 py-4">
            <Skeleton className="h-5 w-32" />
          </td>

          {/* Status Badge */}
          <td className="px-4 py-4">
            <Skeleton className="h-6 w-24 rounded-full" />
          </td>

          {/* Assigned To */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-28" />
          </td>

          {/* Progress */}
          <td className="px-4 py-4">
            <div className="space-y-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </td>

          {/* Items */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </td>

          {/* Created */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}
