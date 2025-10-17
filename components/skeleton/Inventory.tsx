export const InventorySkeleton = () => (
  <tbody className="bg-background divide-y divide-gray-200 dark:divide-zinc-700">
    {Array.from({ length: 20 }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td className="px-4 py-4">
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
        </td>
        <td className="px-4 py-4">
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-20 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-16"></div>
        </td>
        <td className="px-4 py-4">
          <div className="h-6 bg-gray-200 dark:bg-zinc-700 rounded-full w-20"></div>
        </td>

        <td className="px-4 py-4">
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-16"></div>
        </td>
        <td className="px-4 py-4">
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-24"></div>
        </td>
        {/* <td className="px-4 py-4">
          <div className="flex gap-1">
            <div className="h-8 w-8 bg-gray-200 dark:bg-zinc-700 rounded"></div>
            <div className="h-8 w-8 bg-gray-200 dark:bg-zinc-700 rounded"></div>
          </div>
        </td> */}
      </tr>
    ))}
  </tbody>
);
