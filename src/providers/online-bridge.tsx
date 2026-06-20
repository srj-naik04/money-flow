"use client";

import { useEffect } from "react";
import { onlineManager } from "@tanstack/react-query";

/** Wire navigator online/offline events into TanStack Query's onlineManager. */
export function OnlineBridge() {
  useEffect(() => {
    return onlineManager.setEventListener((setOnline) => {
      const onOnline = () => setOnline(true);
      const onOffline = () => setOnline(false);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      setOnline(navigator.onLine);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    });
  }, []);

  return null;
}
