"use client";

import { useState } from "react";

export default function ScrollTest() {
  const [activeTab, setActiveTab] = useState("tab1");

  return (
    <div className="min-h-screen bg-gray-700">
      {/* Full width container with overflow hidden */}
      <div className="overflow-x-auto scrollbar-none px-4">
        <ul className="flex gap-4 w-max whitespace-nowrap">
          {[
            "Tab 1 Long Name",
            "Tab 2 Long Name",
            "Tab 3 Long Name",
            "Tab 4 Long Name",
            "Tab 5 Long Name",
            "Tab 6 Long Name",
            "Tab 7 Long Name",
          ].map((item, idx) => (
            <li
              key={idx}
              className="px-4 py-2 bg-gray-800 text-white rounded-full flex-shrink-0"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
