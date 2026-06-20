import { QueryClient } from "@tanstack/react-query";

const DAY_MS = 1000 * 60 * 60 * 24;

/** Create the app QueryClient with offline-first, cache-persistence-friendly defaults. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data only changes on the user's own mutations (which invalidate the
        // cache and refetch). Between writes it's effectively static, so a long
        // staleTime makes navigation instant (served from the in-memory + idb
        // cache) instead of re-hitting the Singapore DB on every page mount.
        staleTime: 5 * 60_000,
        gcTime: DAY_MS, // keep in cache for offline reads
        retry: 2,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        networkMode: "offlineFirst",
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: 0,
      },
    },
  });
}
