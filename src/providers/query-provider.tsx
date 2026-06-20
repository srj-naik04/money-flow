"use client";

import { useState, type ReactNode } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

import { makeQueryClient } from "@/lib/query-client";
import { APP_VERSION } from "@/lib/constants";

const DAY_MS = 1000 * 60 * 60 * 24;

const idbPersister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get<string>(key).then((v) => v ?? null),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: "mf-query-cache",
  throttleTime: 1000,
});

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeQueryClient());

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister: idbPersister,
        maxAge: DAY_MS,
        buster: APP_VERSION,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === "success",
        },
      }}
      onSuccess={() => {
        // Replay mutations queued while offline within this session. NOTE: the
        // app is online-first by design — cross-reload offline-write replay
        // (which would need setMutationDefaults + per-hook mutationKeys) is
        // intentionally out of scope.
        void client.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
