import { Skeleton } from "@/components/ui/skeleton";

export function InventorySkeleton() {
  return (
    <tbody>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="border-b">
          {/* Product */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32 mt-1" />
            <Skeleton className="h-3 w-24 mt-1" />
          </td>

          {/* Stock Level */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-20 mt-1" />
            <Skeleton className="h-3 w-28 mt-1" />
            <Skeleton className="h-3 w-20 mt-1" />
          </td>

          {/* Status */}
          <td className="px-4 py-4">
            <Skeleton className="h-6 w-20 rounded-full" />
          </td>

          {/* Location(s) */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28 mt-1" />
          </td>

          {/* Last Count */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16 mt-1" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}
