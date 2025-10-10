import { Loader2 } from "lucide-react";

export default function loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">
          Loading order detail...
        </p>
      </div>
    </div>
  );
}
