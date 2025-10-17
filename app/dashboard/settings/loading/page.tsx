import { Loader2 } from "lucide-react";
import React from "react";

const page = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
        <p className="text-gray-600">Loading setting...</p>
      </div>
    </div>
  );
};

export default page;
