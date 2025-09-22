"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

interface Props {
  children: React.ReactNode;
}

export function AppProviders({ children }: Props) {
  // Create QueryClient instance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // How long data stays fresh before background refetch
            staleTime: 30 * 1000, // 30 seconds
            // How long data stays in cache when unused
            gcTime: 5 * 60 * 1000, // 5 minutes
            // Retry failed requests
            retry: 3,
            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus
            refetchOnWindowFocus: true,
            // Background refetch intervals
            refetchOnMount: true,
          },
          mutations: {
            // Retry failed mutations
            retry: 1,
          },
        },
      })
  );

  return (
    <NextAuthSessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* Only show devtools in development */}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </NextAuthSessionProvider>
  );
}

// "use client";

// import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

// interface Props {
//   children: React.ReactNode;
// }

// export function SessionProvider({ children }: Props) {
//   return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
// }
