import { createFileRoute } from "@tanstack/react-router";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const Route = createFileRoute("/api/reports/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        // Validate super admin via bearer token
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { createClient } = await import("@supabase/supabase-js");
        const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userData, error: uErr } = await supa.auth.getUser(token);
        if (uErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const { data: isSA } = await supa.rpc("has_role", { _user_id: userData.user.id, _role: "super_admin" });
        if (!isSA) return new Response("Forbidden", { status: 403 });

        const type = String(params._splat ?? "").replace(/\.pdf$/i, "");
        const { getFinancialSummary } = await import("@/lib/financials.functions");
        // call the underlying handler directly by importing the fn creator would be complex;
        // instead re-derive summary inline via same admin queries:
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const [subs, orders, policies] = await Promise.all([
          supabaseAdmin.from("subscriptions").select("price_per_month, status, plan_name"),
          supabaseAdmin.from("hardware_orders").select("hardware_total, status"),
          supabaseAdmin.from("insurance_policies").select("premium_amount, commission_rate"),
        ]);
        const activeSubs = (subs.data ?? []).filter((s: any) => s.status === "active" || s.status === "trialing");
        const mrr = activeSubs.reduce((s: number, x: any) => s + Number(x.price_per_month ?? 0), 0);
        const iot = (orders.data ?? []).filter((o: any) => o.status !== "cancelled" && o.status !== "pending_payment")
          .reduce((s: number, x: any) => s + Number(x.hardware_total ?? 0), 0);
        const ins = (policies.data ?? []).reduce((s: number, p: any) => s + Number(p.premium_amount ?? 0) * Number(p.commission_rate ?? 0) / 100, 0);
        const total = mrr + iot + ins;
        const cogs = iot * 0.55;
        const gross = total - cogs;
        const opex = total * 0.25;
        const net = gross - opex;

        const pdf = await PDFDocument.create();
        const page = pdf.addPage([595, 842]);
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

        const primary = rgb(0.22, 0.51, 0.34);
        const muted = rgb(0.45, 0.45, 0.45);

        const title = type === "mrr" ? "MRR Report" : type === "revenue" ? "Revenue Breakdown" : "Monthly P&L";
        page.drawText("GrainHero", { x: 40, y: 800, font: bold, size: 12, color: primary });
        page.drawText(title, { x: 40, y: 770, font: bold, size: 22 });
        page.drawText(`Generated ${new Date().toLocaleString()}`, { x: 40, y: 750, font, size: 9, color: muted });
        page.drawLine({ start: { x: 40, y: 740 }, end: { x: 555, y: 740 }, color: primary, thickness: 1.5 });

        const fmt = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;
        const rows: [string, string][] = [
          ["Subscription MRR", fmt(mrr)],
          ["IoT Hardware Revenue", fmt(iot)],
          ["Insurance Commission", fmt(ins)],
          ["Total Revenue", fmt(total)],
          ["Cost of Goods Sold", `- ${fmt(cogs)}`],
          ["Gross Profit", fmt(gross)],
          ["Operating Expenses", `- ${fmt(opex)}`],
          ["Net Profit", fmt(net)],
          ["Net Profit %", `${total > 0 ? ((net / total) * 100).toFixed(2) : "0.00"} %`],
          ["Active subscriptions", String(activeSubs.length)],
        ];
        let y = 700;
        rows.forEach(([k, v]) => {
          page.drawText(k, { x: 40, y, font, size: 12, color: muted });
          page.drawText(v, { x: 400, y, font: bold, size: 12 });
          y -= 26;
        });

        page.drawText("Confidential — GrainHero platform financials", { x: 40, y: 40, font, size: 8, color: muted });

        const bytes = await pdf.save();
        // pdf-lib returns Uint8Array. Copy into a fresh ArrayBuffer to satisfy BodyInit typing.
        const body = new Uint8Array(bytes);
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="grainhero-${type}-${new Date().toISOString().slice(0, 10)}.pdf"`,
          },
        });
      },
    },
  },
});
