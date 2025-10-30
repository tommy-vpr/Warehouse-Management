// components/NotificationBell.tsx
// FIXED - Checks Ably connection state before channel operations
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Bell, Loader2, Package } from "lucide-react";
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
import { toast } from "sonner";
import { useNotificationStore } from "@/stores/notificationStore";

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
  const { client, channel, roleChannel } = useAbly();
  const [showDot, setShowDot] = useState(false);

  const { setUnreadCount } = useNotificationStore();

  const channelBroadcast = useMemo(
    () => new BroadcastChannel("notifications"),
    []
  );

  useEffect(() => {
    return () => {
      channelBroadcast.close();
      console.log("🔌 BroadcastChannel closed");
    };
  }, [channelBroadcast]);

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

  useEffect(() => {
    const unreadCount = data?.unreadCount || 0;
    setUnreadCount(unreadCount);
  }, [data?.unreadCount, setUnreadCount]);

  useEffect(() => {
    if (!sessionStorage.getItem("isLeader")) {
      sessionStorage.setItem("isLeader", "true");
      console.log("👑 This tab is the leader for notification sounds");
    }
  }, []);

  const playNotificationSound = useCallback((data: any) => {
    // if (document.visibilityState !== "visible") return;
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch((e) => console.log("Audio play failed:", e));
    } catch (e) {
      console.log("Audio not available");
    }
  }, []);

  const handleIncomingNotification = useCallback(
    (data: any) => {
      setShowDot(true);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      if (data.type === "NEW_ORDER") {
        toast.success(data.title, {
          description: data.message,
          action: data.link
            ? { label: "View Order", onClick: () => router.push(data.link) }
            : undefined,
        });
      } else if (data.type === "TASK_ASSIGNED") {
        toast.info(data.title, {
          description: data.message,
          icon: <Package className="w-5 h-5" />,
          action: data.link
            ? { label: "View Task", onClick: () => router.push(data.link) }
            : undefined,
        });
      } else if (data.type === "PICK_LIST_ASSIGNED") {
        toast.info(data.title, {
          description: data.message,
          icon: <Package className="w-5 h-5" />,
          action: data.link
            ? { label: "Start Picking", onClick: () => router.push(data.link) }
            : undefined,
          duration: 5000,
        });
      } else {
        toast.info(data.title, { description: data.message });
      }

      channelBroadcast.postMessage(data);

      if (sessionStorage.getItem("isLeader")) {
        playNotificationSound(data);
      }

      setTimeout(() => setShowDot(false), 2000);
    },
    [channelBroadcast, playNotificationSound, queryClient, router]
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!sessionStorage.getItem("isLeader")) return;
      playNotificationSound(event.data);
    };

    channelBroadcast.addEventListener("message", onMessage);
    return () => channelBroadcast.removeEventListener("message", onMessage);
  }, [channelBroadcast, playNotificationSound]);

  // ✅ FIXED: Wait for Ably connection before subscribing
  useEffect(() => {
    if (!client || !channel) return;

    const handleNotification = (message: any) => {
      console.log("🔔 User notification received:", message.data);
      handleIncomingNotification(message.data);
    };

    let isSubscribed = false;

    const subscribeToChannel = async () => {
      try {
        // ✅ CHECK CONNECTION STATE FIRST
        const connectionState = client.connection.state;
        console.log("🔌 Connection state:", connectionState);

        // If connection is closed/failed, wait for it to connect
        if (connectionState === "closed" || connectionState === "failed") {
          console.log("⚠️  Connection not ready, waiting...");
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Connection timeout"));
            }, 10000);

            client.connection.once("connected", () => {
              clearTimeout(timeout);
              console.log("✅ Connection established");
              resolve();
            });

            client.connection.once("failed", () => {
              clearTimeout(timeout);
              reject(new Error("Connection failed"));
            });
          });
        } else if (connectionState === "connecting") {
          // Wait for connection to complete
          console.log("⏳ Waiting for connection...");
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Connection timeout"));
            }, 10000);

            client.connection.once("connected", () => {
              clearTimeout(timeout);
              resolve();
            });

            client.connection.once("failed", () => {
              clearTimeout(timeout);
              reject(new Error("Connection failed"));
            });
          });
        }

        // Now try to subscribe
        if (channel.state === "attached") {
          await channel.subscribe("notification", handleNotification);
          console.log("✅ Subscribed to user notification channel");
        } else {
          await channel.attach();
          await channel.subscribe("notification", handleNotification);
          console.log(
            "✅ Channel attached and subscribed to user notifications"
          );
        }

        isSubscribed = true;
      } catch (error) {
        console.error("❌ Failed to subscribe to user channel:", error);
        // Retry after delay
        setTimeout(() => {
          if (!isSubscribed) {
            subscribeToChannel();
          }
        }, 3000);
      }
    };

    subscribeToChannel();

    return () => {
      if (isSubscribed) {
        try {
          channel.unsubscribe("notification", handleNotification);
          console.log("🔌 Unsubscribed from user notification channel");
        } catch (error) {
          console.error("Failed to unsubscribe from user channel:", error);
        }
      }
    };
  }, [client, channel, handleIncomingNotification]);

  // ✅ FIXED: Wait for Ably connection before subscribing to role channel
  useEffect(() => {
    if (!client || !roleChannel) return;

    const handleRoleNotification = (message: any) => {
      console.log("🔔 Role notification received:", message.data);
      handleIncomingNotification(message.data);
    };

    let isSubscribed = false;

    const subscribeToRoleChannel = async () => {
      try {
        // ✅ CHECK CONNECTION STATE FIRST
        const connectionState = client.connection.state;
        console.log("🔌 Role channel - Connection state:", connectionState);

        // If connection is closed/failed, wait for it to connect
        if (connectionState === "closed" || connectionState === "failed") {
          console.log("⚠️  Connection not ready, waiting...");
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Connection timeout"));
            }, 10000);

            client.connection.once("connected", () => {
              clearTimeout(timeout);
              console.log("✅ Connection established");
              resolve();
            });

            client.connection.once("failed", () => {
              clearTimeout(timeout);
              reject(new Error("Connection failed"));
            });
          });
        } else if (connectionState === "connecting") {
          // Wait for connection to complete
          console.log("⏳ Waiting for connection...");
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Connection timeout"));
            }, 10000);

            client.connection.once("connected", () => {
              clearTimeout(timeout);
              resolve();
            });

            client.connection.once("failed", () => {
              clearTimeout(timeout);
              reject(new Error("Connection failed"));
            });
          });
        }

        // Now try to subscribe
        if (roleChannel.state === "attached") {
          await roleChannel.subscribe("new-order", handleRoleNotification);
          await roleChannel.subscribe("notification", handleRoleNotification);
          console.log("✅ Subscribed to role notification channels");
        } else {
          await roleChannel.attach();
          await roleChannel.subscribe("new-order", handleRoleNotification);
          await roleChannel.subscribe("notification", handleRoleNotification);
          console.log("✅ Role channel attached and subscribed");
        }

        isSubscribed = true;
      } catch (error) {
        console.error("❌ Failed to subscribe to role channel:", error);
        // Retry after delay
        setTimeout(() => {
          if (!isSubscribed) {
            subscribeToRoleChannel();
          }
        }, 3000);
      }
    };

    subscribeToRoleChannel();

    return () => {
      if (isSubscribed) {
        try {
          roleChannel.unsubscribe("new-order", handleRoleNotification);
          roleChannel.unsubscribe("notification", handleRoleNotification);
          console.log("🔌 Unsubscribed from role notification channels");
        } catch (error) {
          console.error("Failed to unsubscribe from role channel:", error);
        }
      }
    };
  }, [client, roleChannel, handleIncomingNotification]);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleNotificationClick = (notification: Notification) => {
    markAsReadMutation.mutate(notification.id);
    if (notification.link) router.push(notification.link);
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
          {/* {showDot && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          )} */}
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
              disabled={markAllReadMutation.isPending}
              className="cursor-pointer"
            >
              {markAllReadMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  <span className="text-xs">Marking...</span>
                </>
              ) : (
                "Mark all read"
              )}
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
                className="flex flex-col items-start m-1 p-3 cursor-pointer relative"
                onClick={() => handleNotificationClick(notification)}
              >
                {!notification.read && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600" />
                )}
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1">
                    <div
                      className={`font-medium ${
                        !notification.read
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {notification.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {notification.message}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import { Bell, Loader2, Package } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
//   DropdownMenuSeparator,
// } from "@/components/ui/dropdown-menu";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { useRouter } from "next/navigation";
// import { useAbly } from "@/context/ably-context";
// import { toast } from "sonner";

// interface Notification {
//   id: string;
//   type: string;
//   title: string;
//   message: string;
//   link?: string;
//   read: boolean;
//   createdAt: string;
// }

// export default function NotificationBell() {
//   const router = useRouter();
//   const queryClient = useQueryClient();
//   const { channel, roleChannel } = useAbly();
//   const [showDot, setShowDot] = useState(false);

//   // ✅ Initialize broadcast channel once
//   const channelBroadcast = new BroadcastChannel("notifications");

//   const { data } = useQuery({
//     queryKey: ["notifications"],
//     queryFn: async () => {
//       const response = await fetch("/api/notifications");
//       if (!response.ok) throw new Error("Failed to fetch notifications");
//       return response.json();
//     },
//     refetchInterval: 30000,
//   });

//   const markAsReadMutation = useMutation({
//     mutationFn: async (id: string) => {
//       const response = await fetch(`/api/notifications/${id}/read`, {
//         method: "PATCH",
//       });
//       if (!response.ok) throw new Error("Failed to mark as read");
//       return response.json();
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["notifications"] });
//     },
//   });

//   const markAllReadMutation = useMutation({
//     mutationFn: async () => {
//       const response = await fetch("/api/notifications/mark-all-read", {
//         method: "POST",
//       });
//       if (!response.ok) throw new Error("Failed to mark all as read");
//       return response.json();
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["notifications"] });
//     },
//   });

//   // Add this effect instead
//   useEffect(() => {
//     const unreadCount = data?.unreadCount || 0;
//     document.title =
//       unreadCount > 0
//         ? `(${unreadCount}) WMS - Warehouse Management System`
//         : "WMS - Warehouse Management System";
//   }, [data?.unreadCount]);

//   // ✅ Elect a “leader” tab (first opened tab)
//   useEffect(() => {
//     if (!sessionStorage.getItem("isLeader")) {
//       sessionStorage.setItem("isLeader", "true");
//       console.log("👑 This tab is the leader for notification sounds");
//     }
//   }, []);

//   // ✅ Listen for notifications rebroadcasted from other tabs
//   useEffect(() => {
//     const onMessage = (event: MessageEvent) => {
//       // Only play sound if this tab is the leader
//       if (!sessionStorage.getItem("isLeader")) return;
//       playNotificationSound(event.data);
//     };

//     channelBroadcast.addEventListener("message", onMessage);
//     return () => channelBroadcast.removeEventListener("message", onMessage);
//   }, []);

//   // ✅ Listen for user-specific notifications
//   useEffect(() => {
//     if (!channel) return;

//     const handleNotification = (message: any) => {
//       console.log("🔔 User notification received:", message.data);
//       handleIncomingNotification(message.data);
//     };

//     channel.subscribe("notification", handleNotification);
//     return () => channel.unsubscribe("notification", handleNotification);
//   }, [channel]);

//   // ✅ Listen for role-based notifications (if you still need them)
//   useEffect(() => {
//     if (!roleChannel) return;

//     const handleRoleNotification = (message: any) => {
//       console.log("🔔 Role notification received:", message.data);
//       handleIncomingNotification(message.data);
//     };

//     roleChannel.subscribe("new-order", handleRoleNotification);
//     roleChannel.subscribe("notification", handleRoleNotification);

//     return () => {
//       roleChannel.unsubscribe("new-order", handleRoleNotification);
//       roleChannel.unsubscribe("notification", handleRoleNotification);
//     };
//   }, [roleChannel]);

//   // ✅ Extracted function to play sound
//   const playNotificationSound = (data: any) => {
//     if (document.visibilityState !== "visible") return; // Only play if tab is active
//     try {
//       const audio = new Audio("/notification.mp3");
//       audio.volume = 0.3;
//       audio.play().catch((e) => console.log("Audio play failed:", e));
//     } catch (e) {
//       console.log("Audio not available");
//     }
//   };

//   // ✅ Handle incoming notifications from Ably
//   const handleIncomingNotification = (data: any) => {
//     setShowDot(true);
//     queryClient.invalidateQueries({ queryKey: ["notifications"] });

//     // Show toast notification
//     if (data.type === "NEW_ORDER") {
//       toast.success(data.title, {
//         description: data.message,
//         action: data.link
//           ? { label: "View Order", onClick: () => router.push(data.link) }
//           : undefined,
//       });
//     } else if (data.type === "TASK_ASSIGNED") {
//       toast.info(data.title, {
//         description: data.message,
//         icon: <Package className="w-5 h-5" />,
//         action: data.link
//           ? { label: "View Task", onClick: () => router.push(data.link) }
//           : undefined,
//       });
//     } else if (data.type === "PICK_LIST_ASSIGNED") {
//       toast.info(data.title, {
//         description: data.message,
//         icon: <Package className="w-5 h-5" />,
//         action: data.link
//           ? { label: "Start Picking", onClick: () => router.push(data.link) }
//           : undefined,
//         duration: 5000,
//       });
//     } else {
//       toast.info(data.title, { description: data.message });
//     }

//     // 👇 Re-broadcast notification to all open tabs
//     channelBroadcast.postMessage(data);

//     // 👑 Only the leader tab actually plays the sound
//     if (sessionStorage.getItem("isLeader")) {
//       playNotificationSound(data);
//     }

//     setTimeout(() => setShowDot(false), 2000);
//   };

//   const notifications = data?.notifications || [];
//   const unreadCount = data?.unreadCount || 0;

//   const handleNotificationClick = (notification: Notification) => {
//     markAsReadMutation.mutate(notification.id);
//     if (notification.link) router.push(notification.link);
//   };

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" size="icon" className="relative cursor-pointer">
//           <Bell className="h-5 w-5" />
//           {unreadCount > 0 && (
//             <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
//               {unreadCount > 9 ? "9+" : unreadCount}
//             </span>
//           )}
//           {showDot && (
//             <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
//           )}
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent align="end" className="w-80">
//         <div className="flex items-center justify-between px-4 py-2">
//           <h3 className="font-semibold">Notifications</h3>
//           {unreadCount > 0 && (
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={() => markAllReadMutation.mutate()}
//               disabled={markAllReadMutation.isPending}
//               className="cursor-pointer"
//             >
//               {markAllReadMutation.isPending ? (
//                 <>
//                   <Loader2 className="w-3 h-3 mr-1 animate-spin" />
//                   <span className="text-xs">Marking...</span>
//                 </>
//               ) : (
//                 "Mark all read"
//               )}
//             </Button>
//           )}
//         </div>
//         <DropdownMenuSeparator />
//         <div className="max-h-96 overflow-y-auto">
//           {notifications.length === 0 ? (
//             <div className="p-4 text-center text-gray-500">
//               No notifications
//             </div>
//           ) : (
//             notifications.map((notification: Notification) => (
//               <DropdownMenuItem
//                 key={notification.id}
//                 className="flex flex-col items-start m-1 p-3 cursor-pointer relative"
//                 onClick={() => handleNotificationClick(notification)}
//               >
//                 {!notification.read && (
//                   <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600" />
//                 )}
//                 <div className="flex items-center gap-2 w-full">
//                   <div className="flex-1">
//                     <div
//                       className={`font-medium ${
//                         !notification.read
//                           ? "text-gray-900 dark:text-white"
//                           : "text-gray-700 dark:text-gray-300"
//                       }`}
//                     >
//                       {notification.title}
//                     </div>
//                     <div className="text-sm text-gray-600 dark:text-gray-400">
//                       {notification.message}
//                     </div>
//                     <div className="text-xs text-gray-500 mt-1">
//                       {new Date(notification.createdAt).toLocaleString()}
//                     </div>
//                   </div>
//                 </div>
//               </DropdownMenuItem>
//             ))
//           )}
//         </div>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }
