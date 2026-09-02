/**
 * Phase 26.5 — Per-endpoint sync run logging. Wraps a raw Response-returning
 * handler so every `/api/public/v1/sync/*` call is captured in
 * `mobile_sync_runs` for the super-admin monitor page. Fire-and-forget so
 * logging failures never break the response.
 */
export async function logSyncRun(entry: {
  endpoint: string;
  actorUserId: string | null;
  status: "ok" | "error";
  durationMs: number;
  rowCount?: number | null;
  errorMessage?: string | null;
  requestMeta?: Record<string, unknown>;
  startedAt: string;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("mobile_sync_runs").insert({
      endpoint: entry.endpoint,
      actor_user_id: entry.actorUserId,
      status: entry.status,
      duration_ms: entry.durationMs,
      row_count: entry.rowCount ?? null,
      error_message: entry.errorMessage ?? null,
      request_meta: (entry.requestMeta ?? {}) as never,
      started_at: entry.startedAt,
      finished_at: new Date().toISOString(),
    } as never);
  } catch (err) {
    console.warn("[sync-monitor] log failed", err);
  }
}

export async function withSyncLogging(
  opts: { endpoint: string; actorUserId?: string | null; requestMeta?: Record<string, unknown> },
  handler: () => Promise<{ response: Response; rowCount?: number | null }>,
): Promise<Response> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  try {
    const { response, rowCount } = await handler();
    const status: "ok" | "error" = response.status >= 400 ? "error" : "ok";
    void logSyncRun({
      endpoint: opts.endpoint,
      actorUserId: opts.actorUserId ?? null,
      status,
      durationMs: Date.now() - started,
      rowCount: rowCount ?? null,
      errorMessage: status === "error" ? `HTTP ${response.status}` : null,
      requestMeta: opts.requestMeta,
      startedAt,
    });
    return response;
  } catch (err) {
    void logSyncRun({
      endpoint: opts.endpoint,
      actorUserId: opts.actorUserId ?? null,
      status: "error",
      durationMs: Date.now() - started,
      errorMessage: (err as Error).message?.slice(0, 500) ?? "unknown error",
      requestMeta: opts.requestMeta,
      startedAt,
    });
    return Response.json({ error: "sync_failed" }, { status: 500 });
  }
}
