/**
 * Phase 23 — Delta sync helper. RLS is enforced via the caller's bearer
 * token, so we can query these tables directly. Cursor is the greater of
 * (updated_at, created_at) ISO string; ordering is stable via (cursor, id).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MobileSettings } from "./mobile-auth.server";

export type SyncOptions = {
  table: string;
  cursorColumn: string; // usually updated_at, else created_at
  columns?: string; // projection
};

export async function runSync<T = unknown>(
  supabase: SupabaseClient,
  settings: MobileSettings,
  since: string | null,
  requestedLimit: number | null,
  opts: SyncOptions,
) {
  const pageSize = Math.min(
    Math.max(1, requestedLimit ?? settings.sync_page_size),
    settings.max_sync_page_size,
  );
  let q = supabase
    .from(opts.table)
    .select(opts.columns ?? "*")
    .order(opts.cursorColumn, { ascending: true })
    .order("id", { ascending: true })
    .limit(pageSize + 1);
  if (since) q = q.gt(opts.cursorColumn, since);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  const last = page[page.length - 1];
  const next_cursor = last ? ((last[opts.cursorColumn] as string | null) ?? null) : since;
  return {
    data: page as T[],
    meta: {
      server_time: new Date().toISOString(),
      cursor: next_cursor,
      has_more: hasMore,
      page_size: pageSize,
      version: "v1",
    },
  };
}
