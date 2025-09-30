import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
      <span className="ml-3 text-gray-600">Loading...</span>
    </div>
  );
}
