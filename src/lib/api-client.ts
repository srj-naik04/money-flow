import type { ApiError } from "@/types/api";

/** Error thrown by the typed fetch client; carries status, code, field errors. */
export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response
  }

  const envelope = json as { ok?: boolean; data?: T; error?: ApiError } | null;
  if (!res.ok || !envelope || envelope.ok === false) {
    const err = envelope?.error ?? {
      code: "network_error",
      message: res.statusText || "Network error. Check your connection.",
    };
    throw new ApiClientError(res.status, err.code, err.message, err.fieldErrors);
  }
  return envelope.data as T;
}

export const api = {
  get: <T>(url: string, signal?: AbortSignal) => request<T>(url, { method: "GET", signal }),
  post: <T>(url: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body ?? {}), signal }),
  patch: <T>(url: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body ?? {}), signal }),
  del: <T>(url: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(url, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
      signal,
    }),
};
