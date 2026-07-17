import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!data) throw new Error("Forbidden: super_admin only");
}

export const getFinancialSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const supabaseAdmin = context.supabase;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [subs, orders, policies, invoices] = await Promise.all([
      supabaseAdmin.from("subscriptions").select("price_per_month, status, plan_name, created_at"),
      supabaseAdmin.from("hardware_orders").select("hardware_total, status, created_at"),
      supabaseAdmin.from("insurance_policies").select("premium_amount, commission_rate, created_at"),
      supabaseAdmin.from("buyer_invoices").select("total_amount, amount_paid, currency, created_at, payment_status"),
    ]);

    const activeSubs = (subs.data ?? []).filter((s: any) => s.status === "active" || s.status === "trialing");
    const mrr = activeSubs.reduce((sum: number, s: any) => sum + Number(s.price_per_month ?? 0), 0);

    const iotRevenue = (orders.data ?? [])
      .filter((o: any) => o.status !== "cancelled" && o.status !== "pending_payment")
      .reduce((s: number, o: any) => s + Number(o.hardware_total ?? 0), 0);

    const insuranceCommission = (policies.data ?? []).reduce(
      (s: number, p: any) => s + (Number(p.premium_amount ?? 0) * Number(p.commission_rate ?? 0)) / 100,
      0,
    );

    const invoicedTotal = (invoices.data ?? []).reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);
    const collectedTotal = (invoices.data ?? []).reduce((s: number, i: any) => s + Number(i.amount_paid ?? 0), 0);

    const totalRevenue = mrr + iotRevenue + insuranceCommission;
    // Simple COGS assumption: hardware cost = 55% of iot revenue
    const cogs = iotRevenue * 0.55;
    const grossProfit = totalRevenue - cogs;
    // Opex simplification: 25% of revenue
    const opex = totalRevenue * 0.25;
    const otherIncome = 0;
    const netProfit = grossProfit - opex + otherIncome;
    const netProfitPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // MoM deltas — MRR
    const thisMonthSubs = activeSubs.filter((s: any) => s.created_at && new Date(s.created_at) >= startOfMonth);
    const lastMonthSubs = activeSubs.filter((s: any) => s.created_at && new Date(s.created_at) >= startOfPrev && new Date(s.created_at) < startOfMonth);
    const mrrDelta = thisMonthSubs.reduce((s: number, x: any) => s + Number(x.price_per_month ?? 0), 0) -
                     lastMonthSubs.reduce((s: number, x: any) => s + Number(x.price_per_month ?? 0), 0);

    // Revenue mix
    const mix = [
      { name: "Subscriptions", value: Math.round(mrr) },
      { name: "IoT Hardware", value: Math.round(iotRevenue) },
      { name: "Insurance Commission", value: Math.round(insuranceCommission) },
      { name: "Other", value: Math.max(0, Math.round(invoicedTotal - collectedTotal - iotRevenue)) },
    ];

    // Plan split
    const planMap: Record<string, number> = {};
    activeSubs.forEach((s: any) => { const k = s.plan_name ?? "unknown"; planMap[k] = (planMap[k] ?? 0) + Number(s.price_per_month ?? 0); });
    const planSplit = Object.entries(planMap).map(([plan, mrr]) => ({ plan, mrr: Math.round(mrr as number) }));

    // 12-month MRR trend (based on cumulative active subs created)
    const trend: { month: string; mrr: number; new: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const activeAt = (subs.data ?? []).filter((s: any) => s.created_at && new Date(s.created_at) < dEnd && (s.status === "active" || s.status === "trialing"));
      const newInMonth = (subs.data ?? []).filter((s: any) => s.created_at && new Date(s.created_at) >= d && new Date(s.created_at) < dEnd);
      trend.push({
        month: d.toLocaleString("default", { month: "short" }),
        mrr: Math.round(activeAt.reduce((sum: number, s: any) => sum + Number(s.price_per_month ?? 0), 0)),
        new: newInMonth.length,
      });
    }

    return {
      kpis: {
        totalRevenue: Math.round(totalRevenue),
        mrr: Math.round(mrr),
        iotRevenue: Math.round(iotRevenue),
        insuranceCommission: Math.round(insuranceCommission),
        grossProfit: Math.round(grossProfit),
        netProfit: Math.round(netProfit),
        netProfitPct: Number(netProfitPct.toFixed(2)),
        mrrDelta: Math.round(mrrDelta),
        activeSubs: activeSubs.length,
        totalOrders: (orders.data ?? []).length,
        totalPolicies: (policies.data ?? []).length,
      },
      pnl: {
        sales: Math.round(totalRevenue),
        cogs: Math.round(cogs),
        grossProfit: Math.round(grossProfit),
        opex: Math.round(opex),
        otherIncome: Math.round(otherIncome),
        netProfit: Math.round(netProfit),
        netProfitPct: Number(netProfitPct.toFixed(2)),
      },
      mix,
      planSplit,
      trend,
    };
  });

export const generateFinancialPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { type: "pnl" | "revenue" | "mrr" }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const supabaseAdmin = context.supabase;
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

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
    const cogs = iot * 0.55, gross = total - cogs, opex = total * 0.25, net = gross - opex;

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const primary = rgb(0.22, 0.51, 0.34);
    const muted = rgb(0.45, 0.45, 0.45);
    const title = data.type === "mrr" ? "MRR Report" : data.type === "revenue" ? "Revenue Breakdown" : "Monthly P&L";
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
    // base64 for transport across RPC boundary
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const base64 = btoa(bin);
    return { filename: `grainhero-${data.type}-${new Date().toISOString().slice(0, 10)}.pdf`, base64 };
  });

