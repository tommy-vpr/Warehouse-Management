"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { AblyProvider } from "@/context/ably-context";

interface Props {
  children: React.ReactNode;
}

export function AppProviders({ children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 3,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  const [persister] = useState(() =>
    typeof window !== "undefined"
      ? createAsyncStoragePersister({
          storage: {
            getItem: (key) =>
              Promise.resolve(window.sessionStorage.getItem(key)),
            setItem: (key, value) =>
              Promise.resolve(window.sessionStorage.setItem(key, value)),
            removeItem: (key) =>
              Promise.resolve(window.sessionStorage.removeItem(key)),
          },
        })
      : undefined
  );

  return (
    <NextAuthSessionProvider>
      <AblyProvider>
        {persister ? (
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
          >
            <NextThemesProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
              storageKey="wms-theme"
            >
              {children}
              {/* {process.env.NODE_ENV === "development" && (
                <ReactQueryDevtools initialIsOpen={false} />
              )} */}
            </NextThemesProvider>
          </PersistQueryClientProvider>
        ) : (
          <QueryClientProvider client={queryClient}>
            <NextThemesProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
              storageKey="wms-theme"
            >
              {children}
              {/* {process.env.NODE_ENV === "development" && (
                <ReactQueryDevtools initialIsOpen={false} />
              )} */}
            </NextThemesProvider>
          </QueryClientProvider>
        )}
      </AblyProvider>
    </NextAuthSessionProvider>
  );
}

// "use client";

// import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
// import { useState } from "react";

// import { ThemeProvider as NextThemesProvider } from "next-themes";
// import type { ThemeProviderProps as NextThemesProviderProps } from "next-themes";

// interface Props {
//   children: React.ReactNode;
// }

// export function AppProviders({ children }: Props) {
//   // Create QueryClient instance
//   const [queryClient] = useState(
//     () =>
//       new QueryClient({
//         defaultOptions: {
//           queries: {
//             // How long data stays fresh before background refetch
//             staleTime: 30 * 1000, // 30 seconds
//             // How long data stays in cache when unused
//             gcTime: 5 * 60 * 1000, // 5 minutes
//             // Retry failed requests
//             retry: 3,
//             // Retry delay with exponential backoff
//             retryDelay: (attemptIndex) =>
//               Math.min(1000 * 2 ** attemptIndex, 30000),
//             // Refetch on window focus
//             refetchOnWindowFocus: true,
//             // Background refetch intervals
//             refetchOnMount: true,
//           },
//           mutations: {
//             // Retry failed mutations
//             retry: 1,
//           },
//         },
//       })
//   );

//   return (
//     <NextAuthSessionProvider>
//       <QueryClientProvider client={queryClient}>
//         <NextThemesProvider
//           attribute="class"
//           defaultTheme="system"
//           enableSystem
//           disableTransitionOnChange
//           storageKey="wms-theme"
//         >
//           {children}
//           {/* Only show devtools in development */}
//           {process.env.NODE_ENV === "development" && (
//             <ReactQueryDevtools initialIsOpen={false} />
//           )}
//         </NextThemesProvider>
//       </QueryClientProvider>
//     </NextAuthSessionProvider>
//   );
// }
