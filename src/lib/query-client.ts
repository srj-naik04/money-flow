import { QueryClient } from "@tanstack/react-query";

const DAY_MS = 1000 * 60 * 60 * 24;

/** Create the app QueryClient with offline-first, cache-persistence-friendly defaults. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Short staleTime: navigation within the window is instant (served from
        // the in-memory + idb cache), but a stale query still refetches on the
        // next mount and when the tab regains focus — so changes made elsewhere
        // (another device, or a direct DB edit) show up promptly. Mutations
        // invalidate immediately, so you always see your own edits at once.
        staleTime: 30_000,
        gcTime: DAY_MS, // keep in cache for offline reads
        retry: 2,
        refetchOnWindowFocus: true,
        networkMode: "offlineFirst",
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: 0,
      },
    },
  });
}
