// components/AblyConnectionDebug.tsx
// Diagnostic component to help debug Ably connection issues
"use client";

import { useEffect, useState } from "react";
import { useAbly } from "@/context/ably-context";
import { useSession } from "next-auth/react";

export default function AblyConnectionDebug() {
  const { client, channel, roleChannel } = useAbly();
  const { data: session } = useSession();
  const [connectionState, setConnectionState] = useState("unknown");
  const [channelState, setChannelState] = useState("unknown");
  const [roleChannelState, setRoleChannelState] = useState("unknown");

  useEffect(() => {
    if (!client) {
      console.log("🔴 Ably client not initialized");
      return;
    }

    console.log("🟢 Ably client initialized");
    console.log("📊 Initial connection state:", client.connection.state);

    const updateStates = () => {
      setConnectionState(client.connection.state);
      setChannelState(channel?.state || "no channel");
      setRoleChannelState(roleChannel?.state || "no channel");
    };

    // Listen to all connection state changes
    client.connection.on((stateChange) => {
      console.log(
        `🔄 Connection: ${stateChange.previous} → ${stateChange.current}`,
        stateChange.reason ? `(${stateChange.reason.message})` : ""
      );
      updateStates();
    });

    // Listen to channel state changes
    if (channel) {
      channel.on((stateChange) => {
        console.log(
          `📺 User channel: ${stateChange.previous} → ${stateChange.current}`
        );
        updateStates();
      });
    }

    if (roleChannel) {
      roleChannel.on((stateChange) => {
        console.log(
          `📺 Role channel: ${stateChange.previous} → ${stateChange.current}`
        );
        updateStates();
      });
    }

    updateStates();
  }, [client, channel, roleChannel]);

  useEffect(() => {
    console.log("👤 Session:", {
      userId: session?.user?.id,
      role: session?.user?.role,
      email: session?.user?.email,
    });
  }, [session]);

  // Only show in development
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="font-bold mb-2">Ably Debug</div>
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Connection:</span>{" "}
          <span
            className={
              connectionState === "connected"
                ? "text-green-400"
                : connectionState === "connecting"
                ? "text-yellow-400"
                : "text-red-400"
            }
          >
            {connectionState}
          </span>
        </div>
        <div>
          <span className="text-gray-400">User Channel:</span>{" "}
          <span
            className={
              channelState === "attached"
                ? "text-green-400"
                : channelState === "attaching"
                ? "text-yellow-400"
                : "text-red-400"
            }
          >
            {channelState}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Role Channel:</span>{" "}
          <span
            className={
              roleChannelState === "attached"
                ? "text-green-400"
                : roleChannelState === "attaching"
                ? "text-yellow-400"
                : "text-red-400"
            }
          >
            {roleChannelState}
          </span>
        </div>
        <div className="text-gray-400 text-[10px] mt-2">
          User: {session?.user?.email?.substring(0, 15)}...
        </div>
      </div>
    </div>
  );
}
