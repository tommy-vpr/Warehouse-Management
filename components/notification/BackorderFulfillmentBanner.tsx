// components/notifications/BackorderFulfillmentBanner.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Ably from "ably";

interface BackorderNotification {
  id: string;
  type: string;
  poReference: string;
  workTasks: number; // Changed from pickTasks
  backorders: number;
  taskNumbers?: string[]; // Added optional task numbers
  timestamp: string;
}

export default function BackorderFulfillmentBanner() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<BackorderNotification[]>(
    []
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Initialize Ably
    const ably = new Ably.Realtime(process.env.NEXT_PUBLIC_ABLY_KEY!);
    const channel = ably.channels.get("warehouse:picking");

    // Listen for backorder-ready events
    channel.subscribe("backorder-ready", (message) => {
      const notification: BackorderNotification = {
        id: Date.now().toString(),
        type: message.data.type,
        poReference: message.data.poReference,
        workTasks: message.data.workTasks, // Changed from pickTasks
        backorders: message.data.backorders,
        taskNumbers: message.data.taskNumbers || [], // Added
        timestamp: new Date().toISOString(),
      };

      setNotifications((prev) => [notification, ...prev].slice(0, 5)); // Keep last 5
      setIsVisible(true);

      // Auto-hide after 10 seconds
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id)
        );
      }, 10000);
    });

    return () => {
      channel.unsubscribe();
      ably.close();
    };
  }, []);

  if (!isVisible || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg shadow-lg border-2 border-green-400 animate-slide-in"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📦</span>
                <h3 className="font-bold text-lg">Backorders Ready!</h3>
              </div>
              <p className="text-sm opacity-90 mb-2">
                {notification.backorders} backorder(s) fulfilled from PO{" "}
                <span className="font-semibold">
                  {notification.poReference}
                </span>
              </p>
              <p className="text-xs opacity-75">
                {notification.workTasks} work task(s) created and ready to claim
              </p>
            </div>
            <button
              onClick={() =>
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notification.id)
                )
              }
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                router.push("/dashboard/picking");
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notification.id)
                );
              }}
              className="flex-1 bg-white text-green-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
            >
              View Pick Tasks
            </button>
            <button
              onClick={() =>
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notification.id)
                )
              }
              className="px-4 py-2 bg-green-700 rounded-lg font-medium hover:bg-green-800 transition-colors text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Add this to your global CSS for the slide-in animation
/*
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
*/
