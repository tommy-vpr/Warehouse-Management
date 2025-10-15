// components/notification-bell.tsx
"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAbly } from "@/context/ably-context";
import { toast } from "sonner"; // Optional: Add sonner for toast notifications

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { channel, roleChannel } = useAbly(); // ← Get both channels
  const [showDot, setShowDot] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to mark all as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Listen for user-specific notifications
  useEffect(() => {
    if (!channel) return;

    const handleNotification = (message: any) => {
      console.log("🔔 User notification received:", message.data);
      handleIncomingNotification(message.data);
    };

    channel.subscribe("notification", handleNotification);

    return () => {
      channel.unsubscribe("notification", handleNotification);
    };
  }, [channel]);

  // Listen for role-based notifications
  useEffect(() => {
    if (!roleChannel) return;

    const handleRoleNotification = (message: any) => {
      console.log("🔔 Role notification received:", message.data);
      handleIncomingNotification(message.data);
    };

    roleChannel.subscribe("new-order", handleRoleNotification);
    roleChannel.subscribe("notification", handleRoleNotification);

    return () => {
      roleChannel.unsubscribe("new-order", handleRoleNotification);
      roleChannel.unsubscribe("notification", handleRoleNotification);
    };
  }, [roleChannel]);

  // Handle incoming notification (from either channel)
  const handleIncomingNotification = (data: any) => {
    setShowDot(true);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });

    // Show toast notification based on type
    if (data.type === "NEW_ORDER") {
      toast.success(data.title, {
        description: data.message,
        action: data.link
          ? {
              label: "View Order",
              onClick: () => router.push(data.link),
            }
          : undefined,
      });
    } else {
      toast.info(data.title, {
        description: data.message,
      });
    }

    // Play notification sound (optional)
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.3;
      audio.play().catch((e) => console.log("Audio play failed:", e));
    } catch (e) {
      console.log("Audio not available");
    }

    setTimeout(() => setShowDot(false), 2000);
  };

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleNotificationClick = (notification: Notification) => {
    markAsReadMutation.mutate(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative cursor-pointer">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          {showDot && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications
            </div>
          ) : (
            notifications.map((notification: Notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start m-1 p-3 cursor-pointer ${
                  !notification.read ? "bg-blue-50 dark:bg-zinc-800" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="font-medium">{notification.title}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {notification.message}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
