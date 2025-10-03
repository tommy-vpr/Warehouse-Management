"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Ably from "ably";

interface AblyContextType {
  client: Ably.Realtime | null;
  channel: Ably.RealtimeChannel | null;
}

const AblyContext = createContext<AblyContextType>({
  client: null,
  channel: null,
});

export function AblyProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [client, setClient] = useState<Ably.Realtime | null>(null);
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Fetch Ably token from your API
    const ablyClient = new Ably.Realtime({
      authUrl: "/api/ably/auth",
      authMethod: "GET",
    });

    setClient(ablyClient);

    // Subscribe to user-specific channel
    const userChannel = ablyClient.channels.get(`user:${session.user.id}`);
    setChannel(userChannel);

    return () => {
      ablyClient.close();
    };
  }, [session?.user?.id]);

  return (
    <AblyContext.Provider value={{ client, channel }}>
      {children}
    </AblyContext.Provider>
  );
}

export function useAbly() {
  return useContext(AblyContext);
}
