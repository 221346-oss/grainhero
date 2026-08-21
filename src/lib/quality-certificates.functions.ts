/**
 * Phase 16 — Batch quality certificates (moisture, purity, etc.).
 * Uploads live in the private `quality-certificates` bucket; UI reads via
 * signed URLs. Metrics schema is driven by marketplace settings.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { emitNotification } from "@/lib/notify";

type Row = Record<string, any>;

export const listBatchCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ batchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("batch_quality_certificates")
      .select("*")
      .eq("batch_id", data.batchId)
      .order("issued_at", { ascending: false });
    if (error) throw error;
    // Attach short-lived signed URLs.
    const out: Row[] = [];
    for (const r of (rows ?? []) as Row[]) {
      let signed: string | null = null;
      if (r.file_path) {
        const { data: s } = await sb.storage
          .from("quality-certificates")
          .createSignedUrl(r.file_path as string, 60 * 30);
        signed = s?.signedUrl ?? null;
      }
      out.push({ ...r, signed_url: signed });
    }
    return { certificates: out };
  });

export const addBatchCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        batchId: z.string().uuid(),
        filePath: z.string().min(1),
        fileName: z.string().min(1),
        labName: z.string().max(200).optional(),
        issuedAt: z.string().datetime().optional(),
        metrics: z.record(z.string(), z.number()).optional(),
        notes: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const settings = await loadMarketplaceSettings(context.supabase);

    const sb = context.supabase as any;
    const { data: batch } = await sb
      .from("grain_batches")
      .select("id, admin_id, batch_id")
      .eq("id", data.batchId)
      .maybeSingle();
    const b = batch as Row | null;
    if (!b) throw new Error("Batch not found");
    if (b.admin_id !== context.userId) {
      const { data: role } = await sb.rpc("get_my_role", { _user_id: context.userId });
      if (role !== "super_admin") throw new Error("Forbidden");
    }

    // Determine pass/fail against configured thresholds.
    let status: "passed" | "failed" | "pending" = "pending";
    if (data.metrics && settings.quality.metrics.length) {
      let ok = true;
      for (const m of settings.quality.metrics) {
        const v = data.metrics[m.key];
        if (typeof v !== "number") continue;
        if (m.min != null && v < m.min) {
          ok = false;
          break;
        }
        if (m.max != null && v > m.max) {
          ok = false;
          break;
        }
      }
      status = ok ? "passed" : "failed";
    }

    const expires =
      settings.quality.certificateValidityDays > 0
        ? new Date(Date.now() + settings.quality.certificateValidityDays * 86400_000).toISOString()
        : null;

    const { data: ins, error } = await sb
      .from("batch_quality_certificates")
      .insert({
        batch_id: b.id,
        admin_id: b.admin_id,
        file_path: data.filePath,
        file_name: data.fileName,
        lab_name: data.labName ?? null,
        issued_at: data.issuedAt ?? new Date().toISOString(),
        expires_at: expires,
        metrics: (data.metrics ?? {}) as never,
        notes: data.notes ?? null,
        status,
        uploaded_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw error;

    void emitNotification(sb, {
      recipientId: b.admin_id as string,
      tenantAdminId: b.admin_id as string,
      category: "ops",
      severity: status === "failed" ? "warning" : "info",
      title: `Quality certificate ${status}`,
      body: `Batch ${b.batch_id ?? b.id}: ${data.fileName}`,
      link: `/silos`,
      entityType: "grain_batch",
      entityId: b.id as string,
    });
    return { certificateId: (ins as Row).id as string, status };
  });

export const verifyCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        certificateId: z.string().uuid(),
        approved: z.boolean(),
        note: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: role } = await sb.rpc("get_my_role", { _user_id: context.userId });
    if (role !== "super_admin") throw new Error("Forbidden");
    const { error } = await sb
      .from("batch_quality_certificates")
      .update({
        verified_at: new Date().toISOString(),
        verified_by: context.userId,
        status: data.approved ? "verified" : "rejected",
        verification_note: data.note ?? null,
      } as never)
      .eq("id", data.certificateId);
    if (error) throw error;
    return { ok: true };
  });

export const listPendingCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data: role } = await sb.rpc("get_my_role", { _user_id: context.userId });
    if (role !== "super_admin") throw new Error("Forbidden");
    const { data: rows } = await sb
      .from("batch_quality_certificates")
      .select("*, grain_batches(batch_id, grain_type)")
      .in("status", ["pending", "passed", "failed"])
      .is("verified_at", null)
      .order("issued_at", { ascending: false })
      .limit(200);
    return { certificates: (rows ?? []) as Row[] };
  });
