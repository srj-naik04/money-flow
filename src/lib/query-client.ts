import { QueryClient } from "@tanstack/react-query";

const DAY_MS = 1000 * 60 * 60 * 24;

/** Create the app QueryClient with offline-first, cache-persistence-friendly defaults. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: DAY_MS, // keep in cache for offline reads
        retry: 2,
        refetchOnWindowFocus: false,
        networkMode: "offlineFirst",
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: 0,
      },
    },
  });
}
