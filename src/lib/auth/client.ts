"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/**
 * Browser-side Neon Auth client. Takes no base URL — it talks to the same-origin
 * `/api/auth/[...path]` proxy, which forwards to the Neon Auth server. Exposes
 * the Better Auth API plus React hooks (`useSession`).
 */
export const authClient = createAuthClient();
