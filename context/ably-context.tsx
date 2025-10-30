// context/ably-context.tsx
// FIXED - Proper connection lifecycle management
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import Ably from "ably";

interface AblyContextType {
  client: Ably.Realtime | null;
  channel: Ably.RealtimeChannel | null;
  roleChannel: Ably.RealtimeChannel | null;
  connectionState: Ably.ConnectionState;
  isConnected: boolean;
}

const AblyContext = createContext<AblyContextType>({
  client: null,
  channel: null,
  roleChannel: null,
  connectionState: "initialized",
  isConnected: false,
});

export function AblyProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [client, setClient] = useState<Ably.Realtime | null>(null);
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);
  const [roleChannel, setRoleChannel] = useState<Ably.RealtimeChannel | null>(
    null
  );
  const [connectionState, setConnectionState] =
    useState<Ably.ConnectionState>("initialized");

  // ✅ Use ref to prevent re-initialization
  const clientRef = useRef<Ably.Realtime | null>(null);
  const isInitializing = useRef(false);

  useEffect(() => {
    // Don't initialize if no session or already initialized
    if (!session?.user?.id || clientRef.current || isInitializing.current) {
      return;
    }

    console.log("🚀 Initializing Ably connection for user:", session.user.id);
    isInitializing.current = true;

    const ablyClient = new Ably.Realtime({
      authUrl: "/api/ably/auth",
      authMethod: "GET",
      autoConnect: true,
      // ✅ Add these options for better reliability
      disconnectedRetryTimeout: 3000,
      suspendedRetryTimeout: 3000,
    });

    // Track all connection state changes
    ablyClient.connection.on((stateChange) => {
      console.log(
        `🔌 Ably connection: ${stateChange.previous} → ${stateChange.current}`
      );
      setConnectionState(stateChange.current);

      if (stateChange.current === "connected") {
        console.log("✅ Ably connected successfully");
      } else if (stateChange.current === "failed") {
        console.error("❌ Ably connection failed:", stateChange.reason);
      } else if (stateChange.current === "disconnected") {
        console.warn("⚠️  Ably disconnected:", stateChange.reason);
      } else if (stateChange.current === "suspended") {
        console.warn("⏸️  Ably connection suspended");
      } else if (stateChange.current === "closing") {
        console.log("🔌 Ably connection closing");
      } else if (stateChange.current === "closed") {
        console.log("🔌 Ably connection closed");
      }
    });

    // Set initial connection state
    setConnectionState(ablyClient.connection.state);

    // Store in ref
    clientRef.current = ablyClient;
    setClient(ablyClient);

    // Set up user channel
    const userChannel = ablyClient.channels.get(`user:${session.user.id}`);
    setChannel(userChannel);
    console.log("📺 User channel created: user:" + session.user.id);

    // Set up role channel if role exists
    if (session.user.role) {
      const roleChan = ablyClient.channels.get(`role:${session.user.role}`);
      setRoleChannel(roleChan);
      console.log("📺 Role channel created: role:" + session.user.role);
    }

    isInitializing.current = false;

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up Ably connection");
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
      setClient(null);
      setChannel(null);
      setRoleChannel(null);
      setConnectionState("closed");
    };
  }, [session?.user?.id, session?.user?.role]); // Only depend on user ID and role

  const isConnected = connectionState === "connected";

  return (
    <AblyContext.Provider
      value={{ client, channel, roleChannel, connectionState, isConnected }}
    >
      {children}
    </AblyContext.Provider>
  );
}

export function useAbly() {
  return useContext(AblyContext);
}

// "use client";

// import React, { createContext, useContext, useEffect, useState } from "react";
// import { useSession } from "next-auth/react";
// import Ably from "ably";

// interface AblyContextType {
//   client: Ably.Realtime | null;
//   channel: Ably.RealtimeChannel | null;
// }

// const AblyContext = createContext<AblyContextType>({
//   client: null,
//   channel: null,
// });

// export function AblyProvider({ children }: { children: React.ReactNode }) {
//   const { data: session } = useSession();
//   const [client, setClient] = useState<Ably.Realtime | null>(null);
//   const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);

//   useEffect(() => {
//     if (!session?.user?.id) return;

//     // Fetch Ably token from your API
//     const ablyClient = new Ably.Realtime({
//       authUrl: "/api/ably/auth",
//       authMethod: "GET",
//     });

//     setClient(ablyClient);

//     // Subscribe to user-specific channel
//     const userChannel = ablyClient.channels.get(`user:${session.user.id}`);
//     setChannel(userChannel);

//     return () => {
//       ablyClient.close();
//     };
//   }, [session?.user?.id]);

//   return (
//     <AblyContext.Provider value={{ client, channel }}>
//       {children}
//     </AblyContext.Provider>
//   );
// }

// export function useAbly() {
//   return useContext(AblyContext);
// }
