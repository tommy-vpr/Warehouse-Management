import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function POListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {/* Left side */}
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-x-6 gap-y-3">
                  {/* PO Number */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-5 h-5 rounded" />
                    <Skeleton className="h-5 w-28" />
                  </div>

                  {/* Status */}
                  <Skeleton className="h-6 w-20 rounded-full" />

                  {/* Vendor */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>

                  {/* Expected Date */}
                  <Skeleton className="h-4 w-32" />

                  {/* Items & Units */}
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="flex gap-2 ml-4">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-8 w-32 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
