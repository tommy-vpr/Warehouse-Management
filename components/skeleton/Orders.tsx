import { Skeleton } from "@/components/ui/skeleton";

export function OrdersTableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="border-b">
          {/* Checkbox */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-4" />
          </td>

          {/* Order Number */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32 mt-1" />
          </td>

          {/* Customer */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40 mt-1" />
          </td>

          {/* Status */}
          <td className="px-4 py-4">
            <Skeleton className="h-6 w-20 rounded-full" />
          </td>

          {/* Items */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-20 mt-1" />
          </td>

          {/* Total */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-20" />
          </td>

          {/* Priority */}
          <td className="px-4 py-4">
            <Skeleton className="h-6 w-16 rounded-full" />
          </td>

          {/* Actions */}
          <td className="px-4 py-4">
            <div className="flex gap-1">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </td>

          {/* View Link */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-12" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}
