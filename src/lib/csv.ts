import Papa from "papaparse";

/** Neutralize spreadsheet formula injection from user-controlled text without
 * mangling legitimate negative numbers. */
function sanitizeCell(v: unknown): unknown {
  if (typeof v !== "string" || v === "") return v;
  const c = v[0];
  if (c === "=" || c === "+" || c === "@" || c === "\t" || c === "\r") return `'${v}`;
  if (c === "-" && !/^-\d/.test(v)) return `'${v}`; // a dash not starting a number
  return v;
}

/** Serialize rows to CSV with a UTF-8 BOM so Excel renders ₹ and Indian text. */
export function toCsv(rows: Record<string, unknown>[]): string {
  const safe = rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(r)) o[k] = sanitizeCell(r[k]);
    return o;
  });
  const csv = Papa.unparse(safe, { quotes: true });
  return "﻿" + csv;
}

/** Trigger a client-side download of text content as a file. */
export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
