import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AssumptionSchema = z
  .object({
    iotCostPct: z.number().min(0).max(100).optional(),
    opexPct: z.number().min(0).max(100).optional(),
  })
  .optional();

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "super_admin",
  });
  if (!data) throw new Error("Forbidden: super_admin only");
}

export const getFinancialSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AssumptionSchema.parse(d) ?? {})
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const supabaseAdmin = context.supabase;
    const { computeMrr } = await import("@/lib/plan-pricing.server");
    const iotCostPct = Number(data?.iotCostPct ?? 55);
    const opexPct = Number(data?.opexPct ?? 25);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [subs, orders, policies, invoices] = await Promise.all([
      supabaseAdmin
        .from("subscriptions")
        .select("admin_id, price_per_month, status, plan_id, plan_name, created_at"),
      supabaseAdmin
        .from("hardware_orders")
        .select("hardware_total, hardware_quantity, hardware_unit_cost, status, created_at"),
      supabaseAdmin
        .from("insurance_policies")
        .select("premium_amount, commission_rate, created_at"),
      supabaseAdmin
        .from("buyer_invoices")
        .select("total_amount, amount_paid, currency, created_at, payment_status"),
    ]);

    // Logistics operating costs (Phase 17) — subtracted from gross profit.
    const { data: logisticsRows } = await supabaseAdmin
      .from("logistics_cost_entries")
      .select("amount, category, incurred_at");
    const logisticsCost = (logisticsRows ?? []).reduce(
      (s: number, r: any) => s + Number(r.amount ?? 0),
      0,
    );

    // Unified PKR MRR — plan_thresholds is the single source of truth.
    const { data: planProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, subscription_plan, created_at")
      .not("subscription_plan", "is", null);
    const mrrResult = await computeMrr({
      supabase: supabaseAdmin,
      subscriptions: subs.data ?? [],
      profiles: planProfiles ?? [],
    });
    const activeSubs = mrrResult.entries;
    const mrr = mrrResult.mrr;

    const activeOrders = (orders.data ?? []).filter(
      (o: any) => o.status !== "cancelled" && o.status !== "pending_payment",
    );
    const iotRevenue = activeOrders.reduce(
      (s: number, o: any) => s + Number(o.hardware_total ?? 0),
      0,
    );
    // Precise hardware COGS from recorded unit cost × quantity.
    const hardwareUnitCogs = activeOrders.reduce(
      (s: number, o: any) =>
        s + Number(o.hardware_unit_cost ?? 0) * Number(o.hardware_quantity ?? 0),
      0,
    );

    const insuranceCommission = (policies.data ?? []).reduce(
      (s: number, p: any) =>
        s + (Number(p.premium_amount ?? 0) * Number(p.commission_rate ?? 0)) / 100,
      0,
    );

    const invoicedTotal = (invoices.data ?? []).reduce(
      (s: number, i: any) => s + Number(i.total_amount ?? 0),
      0,
    );
    const collectedTotal = (invoices.data ?? []).reduce(
      (s: number, i: any) => s + Number(i.amount_paid ?? 0),
      0,
    );

    const totalRevenue = mrr + iotRevenue + insuranceCommission;
    // Prefer per-unit recorded cost when we have it; fall back to iotCostPct assumption.
    const cogs = hardwareUnitCogs > 0 ? hardwareUnitCogs : iotRevenue * (iotCostPct / 100);
    const grossProfit = totalRevenue - cogs;
    // Opex simplification: configurable % of total revenue
    const opex = totalRevenue * (opexPct / 100) + logisticsCost;
    const otherIncome = 0;
    const netProfit = grossProfit - opex + otherIncome;
    const netProfitPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // MoM deltas — MRR
    const thisMonthSubs = activeSubs.filter(
      (s: any) => s.created_at && new Date(s.created_at) >= startOfMonth,
    );
    const lastMonthSubs = activeSubs.filter(
      (s: any) =>
        s.created_at &&
        new Date(s.created_at) >= startOfPrev &&
        new Date(s.created_at) < startOfMonth,
    );
    const mrrDelta =
      thisMonthSubs.reduce((s: number, x: any) => s + Number(x.price ?? 0), 0) -
      lastMonthSubs.reduce((s: number, x: any) => s + Number(x.price ?? 0), 0);

    // Revenue mix
    const mix = [
      { name: "Subscriptions", value: Math.round(mrr) },
      { name: "IoT Hardware", value: Math.round(iotRevenue) },
      { name: "Insurance Commission", value: Math.round(insuranceCommission) },
      {
        name: "Other",
        value: Math.max(0, Math.round(invoicedTotal - collectedTotal - iotRevenue)),
      },
    ];

    // Plan split
    const planMap: Record<string, number> = {};
    activeSubs.forEach((s: any) => {
      const k = s.plan_name ?? "Unknown";
      planMap[k] = (planMap[k] ?? 0) + Number(s.price ?? 0);
    });
    const planSplit = Object.entries(planMap).map(([plan, mrr]) => ({
      plan,
      mrr: Math.round(mrr as number),
    }));

    // 12-month MRR trend (based on cumulative active subs created)
    const trend: { month: string; mrr: number; new: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const activeAt = activeSubs.filter((s: any) => s.created_at && new Date(s.created_at) < dEnd);
      const newInMonth = activeSubs.filter(
        (s: any) => s.created_at && new Date(s.created_at) >= d && new Date(s.created_at) < dEnd,
      );
      trend.push({
        month: d.toLocaleString("default", { month: "short" }),
        mrr: Math.round(activeAt.reduce((sum: number, s: any) => sum + Number(s.price ?? 0), 0)),
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
      assumptions: { iotCostPct, opexPct },
      pnl: {
        sales: Math.round(totalRevenue),
        cogs: Math.round(cogs),
        grossProfit: Math.round(grossProfit),
        opex: Math.round(opex),
        logisticsCost: Math.round(logisticsCost),
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
  .inputValidator(
    (d: { type: "pnl" | "revenue" | "mrr"; iotCostPct?: number; opexPct?: number }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const supabaseAdmin = context.supabase;
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const iotCostPct = Number(data.iotCostPct ?? 55);
    const opexPct = Number(data.opexPct ?? 25);

    const { computeMrr } = await import("@/lib/plan-pricing.server");
    const [subs, orders, policies] = await Promise.all([
      supabaseAdmin
        .from("subscriptions")
        .select("admin_id, price_per_month, status, plan_id, plan_name, created_at"),
      supabaseAdmin.from("hardware_orders").select("hardware_total, status"),
      supabaseAdmin.from("insurance_policies").select("premium_amount, commission_rate"),
    ]);
    const { data: planProfilesFull } = await supabaseAdmin
      .from("profiles")
      .select("id, subscription_plan, created_at")
      .not("subscription_plan", "is", null);
    const mrrResult = await computeMrr({
      supabase: supabaseAdmin,
      subscriptions: subs.data ?? [],
      profiles: planProfilesFull ?? [],
    });
    const activeSubs = mrrResult.entries;
    const mrr = mrrResult.mrr;
    const iot = (orders.data ?? [])
      .filter((o: any) => o.status !== "cancelled" && o.status !== "pending_payment")
      .reduce((s: number, x: any) => s + Number(x.hardware_total ?? 0), 0);
    const ins = (policies.data ?? []).reduce(
      (s: number, p: any) =>
        s + (Number(p.premium_amount ?? 0) * Number(p.commission_rate ?? 0)) / 100,
      0,
    );
    const total = mrr + iot + ins;
    const cogs = iot * (iotCostPct / 100),
      gross = total - cogs,
      opex = total * (opexPct / 100),
      net = gross - opex;

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const primary = rgb(0.22, 0.51, 0.34);
    const muted = rgb(0.45, 0.45, 0.45);
    const title =
      data.type === "mrr"
        ? "MRR Report"
        : data.type === "revenue"
          ? "Revenue Breakdown"
          : "Monthly P&L";
    page.drawText("GrainHero", { x: 40, y: 800, font: bold, size: 12, color: primary });
    page.drawText(title, { x: 40, y: 770, font: bold, size: 22 });
    page.drawText(`Generated ${new Date().toLocaleString()}`, {
      x: 40,
      y: 750,
      font,
      size: 9,
      color: muted,
    });
    page.drawLine({
      start: { x: 40, y: 740 },
      end: { x: 555, y: 740 },
      color: primary,
      thickness: 1.5,
    });
    const fmt = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;
    const rows: [string, string][] = [
      ["Subscription MRR", fmt(mrr)],
      ["IoT Hardware Revenue", fmt(iot)],
      ["Insurance Commission", fmt(ins)],
      ["Total Revenue", fmt(total)],
      [`Cost of Goods Sold (${iotCostPct}% of IoT)`, `- ${fmt(cogs)}`],
      ["Gross Profit", fmt(gross)],
      [`Operating Expenses (${opexPct}% of revenue)`, `- ${fmt(opex)}`],
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
    page.drawText("Confidential — GrainHero platform financials", {
      x: 40,
      y: 40,
      font,
      size: 8,
      color: muted,
    });

    const bytes = await pdf.save();
    // base64 for transport across RPC boundary
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const base64 = btoa(bin);
    return {
      filename: `grainhero-${data.type}-${new Date().toISOString().slice(0, 10)}.pdf`,
      base64,
    };
  });
