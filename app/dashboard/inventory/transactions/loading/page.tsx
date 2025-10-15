import { Package } from "lucide-react";

// app/dashboard/inventory/loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-600">Loading transactions...</p>
      </div>
    </div>
  );
}
