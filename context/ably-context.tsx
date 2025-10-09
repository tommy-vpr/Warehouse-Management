"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Ably from "ably";

interface AblyContextType {
  client: Ably.Realtime | null;
  channel: Ably.RealtimeChannel | null;
  roleChannel: Ably.RealtimeChannel | null; // ← Add role channel
}

const AblyContext = createContext<AblyContextType>({
  client: null,
  channel: null,
  roleChannel: null,
});

export function AblyProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [client, setClient] = useState<Ably.Realtime | null>(null);
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);
  const [roleChannel, setRoleChannel] = useState<Ably.RealtimeChannel | null>(
    null
  );

  useEffect(() => {
    if (!session?.user?.id) return;

    console.log("🔌 Initializing Ably connection for user:", session.user.id);

    // Fetch Ably token from your API
    const ablyClient = new Ably.Realtime({
      authUrl: "/api/ably/auth",
      authMethod: "GET",
    });

    // Connection status logging
    ablyClient.connection.on("connected", () => {
      console.log("✅ Ably connected");
    });

    ablyClient.connection.on("disconnected", () => {
      console.log("❌ Ably disconnected");
    });

    ablyClient.connection.on("failed", (error) => {
      console.error("❌ Ably connection failed:", error);
    });

    setClient(ablyClient);

    // Subscribe to user-specific channel
    const userChannel = ablyClient.channels.get(`user:${session.user.id}`);
    console.log("📡 Subscribed to user channel:", `user:${session.user.id}`);
    setChannel(userChannel);

    // Subscribe to role channel if user has a role
    if (session.user.role) {
      const userRoleChannel = ablyClient.channels.get(
        `role:${session.user.role}`
      );
      console.log(
        "📡 Subscribed to role channel:",
        `role:${session.user.role}`
      );
      setRoleChannel(userRoleChannel);
    }

    return () => {
      console.log("🔌 Closing Ably connection");
      ablyClient.close();
    };
  }, [session?.user?.id, session?.user?.role]);

  return (
    <AblyContext.Provider value={{ client, channel, roleChannel }}>
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
