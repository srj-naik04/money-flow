import { NextResponse } from "next/server";
import type { ApiError, Paginated } from "@/types/api";

/** Success envelope. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

/** Paginated success envelope. */
export function list<T>(items: T[], nextCursor: string | null = null): NextResponse {
  return NextResponse.json({ ok: true, data: { items, nextCursor } satisfies Paginated<T> });
}

/** Failure envelope. */
export function fail(error: ApiError, status: number): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}
