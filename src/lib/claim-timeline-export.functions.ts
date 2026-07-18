/**
 * Phase 22 — Export insurance claim timeline as CSV or PDF.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function csvLine(vals: unknown[]): string {
  return vals.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
}

export const exportClaimTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ claim_id: z.string().uuid(), format: z.enum(["csv", "pdf"]).default("csv") }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: claim } = await sb.from("insurance_claims").select("*").eq("id", data.claim_id).single();
    if (!claim) throw new Error("Claim not found");
    const { data: events } = await sb.from("insurance_claim_events").select("*").eq("claim_id", data.claim_id).order("created_at", { ascending: true });

    if (data.format === "csv") {
      const header = csvLine(["timestamp", "event_type", "actor_user_id", "status", "notes"]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = ((events ?? []) as any[]).map((e) => csvLine([e.created_at, e.event_type, e.actor_user_id, e.status ?? "", e.notes ?? ""])).join("\n");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b64 = Buffer.from(`${header}\n${body}`).toString("base64");
      return { format: "csv" as const, filename: `claim_${claim.id}_timeline.csv`, content_base64: b64 };
    }

    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    let page = doc.addPage([595, 842]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    let y = 800;
    page.drawText("Insurance Claim Timeline", { x: 40, y, size: 18, font: bold, color: rgb(0.05, 0.35, 0.2) });
    y -= 30;
    page.drawText(`Claim: ${claim.id}`, { x: 40, y, size: 10, font });
    y -= 14;
    page.drawText(`Status: ${claim.status ?? "n/a"}`, { x: 40, y, size: 10, font });
    y -= 24;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const e of ((events ?? []) as any[])) {
      if (y < 60) { page = doc.addPage([595, 842]); y = 800; }
      page.drawText(`${new Date(e.created_at).toISOString().replace("T", " ").slice(0, 19)}`, { x: 40, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
      page.drawText(`${e.event_type ?? ""}`, { x: 180, y, size: 9, font: bold });
      page.drawText(`${(e.notes ?? "").toString().slice(0, 60)}`, { x: 300, y, size: 9, font });
      y -= 14;
    }
    const bytes = await doc.save();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b64 = Buffer.from(bytes).toString("base64");
    return { format: "pdf" as const, filename: `claim_${claim.id}_timeline.pdf`, content_base64: b64 };
  });