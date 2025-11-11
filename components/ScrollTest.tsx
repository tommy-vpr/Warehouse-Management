"use client";

import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"; // or replace with a simple clsx/join helper

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full max-w-sm items-start justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "border-red-300 bg-red-50 text-red-800 dark:bg-red-400 dark:text-gray-800",
        success:
          "border-green-300 bg-green-50 text-green-800 dark:bg-green-400 dark:text-gray-800",
        info: "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-400 dark:text-gray-800",
        warning:
          "border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-400 dark:text-gray-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export default function ToastPreview() {
  const variants = ["default", "destructive", "success", "info", "warning"];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center space-y-3 p-6">
      {variants.map((variant) => (
        <div key={variant} className={cn(toastVariants({ variant }))}>
          <div>
            <strong className="block capitalize">{variant} toast</strong>
            <p className="text-sm opacity-80">
              This is an example of the {variant} variant.
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// "use client";

// import { useState } from "react";

// export default function ScrollTest() {
//   const [activeTab, setActiveTab] = useState("tab1");

//   return (
//     <div className="min-h-screen bg-zinc-900 w-full overflow-x-hidden">
//       <div className="mx-auto p-4">
//         <h1 className="text-2xl font-bold mb-4">🧪 Zebra TC22 Scroll Test</h1>

//         <div className="overflow-x-auto">
//           <div className="flex w-max border-b border-gray-200">
//             {[...Array(30)].map((_, i) => (
//               <button
//                 key={i}
//                 className="px-8 py-4 text-sm font-medium text-gray-700 hover:text-blue-600 whitespace-nowrap flex-shrink-0"
//               >
//                 NAV_ITEM_{i + 1}_WITH_VERY_LONG_LABEL
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
