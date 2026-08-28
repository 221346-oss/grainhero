/**
 * Platform reporting functions for super admin dashboard
 * Includes customer feedback, warehouse metrics, and technician performance
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRole } from "./rbac.server";

type Row = Record<string, any>;

/* ---------------- Customer Feedback ---------------- */

export const getCustomerFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        limit: z.number().optional().default(50),
        minRating: z.number().min(1).max(5).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("customer_feedback")
      .select(
        `
        *,
        order:hardware_orders!inner(
          id,
          plan_name,
          hardware_quantity,
          install_city,
          created_at
        ),
        admin:profiles!customer_feedback_admin_id_fkey(
          id,
          name,
          email
        ),
        technician:profiles!customer_feedback_technician_id_fkey(
          id,
          name,
          email
        ),
        warehouse:warehouses(
          id,
          name,
          warehouse_id
        )
      `,
      )
      .order("submitted_at", { ascending: false })
      .limit(data.limit);

    if (data.minRating) {
      query = query.gte("overall_rating", data.minRating);
    }

    const { data: feedback, error } = await query;
    if (error) throw error;

    // Calculate aggregates
    const ratings = feedback ?? [];
    const avgOverall =
      ratings.length > 0
        ? ratings.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / ratings.length
        : 0;
    const avgTechnician =
      ratings.length > 0
        ? ratings.reduce((sum, f) => sum + (f.technician_rating || 0), 0) / ratings.length
        : 0;
    const avgInstallQuality =
      ratings.length > 0
        ? ratings.reduce((sum, f) => sum + (f.installation_quality || 0), 0) / ratings.length
        : 0;
    const recommendCount = ratings.filter((f) => f.would_recommend === true).length;
    const recommendPercent = ratings.length > 0 ? (recommendCount / ratings.length) * 100 : 0;

    return {
      feedback: ratings as Row[],
      aggregates: {
        totalCount: ratings.length,
        avgOverallRating: parseFloat(avgOverall.toFixed(2)),
        avgTechnicianRating: parseFloat(avgTechnician.toFixed(2)),
        avgInstallQuality: parseFloat(avgInstallQuality.toFixed(2)),
        recommendPercent: parseFloat(recommendPercent.toFixed(1)),
        recommendCount,
      },
    };
  });

export const submitCustomerFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        overallRating: z.number().min(1).max(5),
        technicianRating: z.number().min(1).max(5).optional(),
        installationQuality: z.number().min(1).max(5).optional(),
        timelinessRating: z.number().min(1).max(5).optional(),
        communicationRating: z.number().min(1).max(5).optional(),
        comments: z.string().max(2000).optional(),
        wouldRecommend: z.boolean().optional(),
        issues: z.array(z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get order details
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id, admin_id, assigned_technician_id, warehouse_id")
      .eq("id", data.orderId)
      .single();

    if (orderErr || !order) throw new Error("Order not found");
    const o = order as Row;

    // Verify user is the order owner
    if (o.admin_id !== context.userId) {
      throw new Error("You can only submit feedback for your own orders");
    }

    // Insert feedback
    const { data: feedback, error } = await supabaseAdmin
      .from("customer_feedback")
      .insert({
        order_id: data.orderId,
        admin_id: o.admin_id,
        technician_id: o.assigned_technician_id,
        warehouse_id: o.warehouse_id,
        overall_rating: data.overallRating,
        technician_rating: data.technicianRating,
        installation_quality: data.installationQuality,
        timeliness_rating: data.timelinessRating,
        communication_rating: data.communicationRating,
        comments: data.comments,
        would_recommend: data.wouldRecommend,
        issues_encountered: data.issues,
      })
      .select()
      .single();

    if (error) throw error;

    return { feedback: feedback as Row };
  });

/* ---------------- Warehouse Operations Metrics ---------------- */

export const getWarehouseOperationsMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get warehouse operations summary from view
    const { data: warehouses, error } = await supabaseAdmin
      .from("warehouse_operations_summary_v" as never)
      .select("*")
      .order("utilization_percent", { ascending: false });

    if (error) throw error;

    // Calculate platform-wide aggregates
    const warehouseList = warehouses ?? [];
    const totalWarehouses = warehouseList.length;
    const totalCapacity = warehouseList.reduce(
      (sum: number, w: any) => sum + (Number(w.total_capacity_kg) || 0),
      0,
    );
    const totalOccupied = warehouseList.reduce(
      (sum: number, w: any) => sum + (Number(w.total_occupied_kg) || 0),
      0,
    );
    const avgUtilization = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;
    const totalSilos = warehouseList.reduce(
      (sum: number, w: any) => sum + (Number(w.active_silos) || 0),
      0,
    );
    const totalAlerts = warehouseList.reduce(
      (sum: number, w: any) => sum + (Number(w.recent_alerts) || 0),
      0,
    );
    const totalIncidents = warehouseList.reduce(
      (sum: number, w: any) => sum + (Number(w.quality_incidents) || 0),
      0,
    );

    // Top performers and issues
    const topUtilized = warehouseList.filter((w: any) => w.utilization_percent > 0).slice(0, 5);
    const underUtilized = warehouseList
      .filter((w: any) => w.utilization_percent < 50)
      .sort((a: any, b: any) => a.utilization_percent - b.utilization_percent)
      .slice(0, 5);
    const withIssues = warehouseList
      .filter((w: any) => (w.recent_alerts || 0) > 0 || (w.quality_incidents || 0) > 0)
      .sort(
        (a: any, b: any) =>
          (b.recent_alerts || 0) +
          (b.quality_incidents || 0) -
          ((a.recent_alerts || 0) + (a.quality_incidents || 0)),
      )
      .slice(0, 10);

    return {
      warehouses: warehouseList as Row[],
      platformAggregates: {
        totalWarehouses,
        totalCapacityKg: totalCapacity,
        totalOccupiedKg: totalOccupied,
        avgUtilizationPercent: parseFloat(avgUtilization.toFixed(1)),
        totalActiveSilos: totalSilos,
        totalRecentAlerts: totalAlerts,
        totalQualityIncidents: totalIncidents,
      },
      insights: {
        topUtilized: topUtilized as Row[],
        underUtilized: underUtilized as Row[],
        withIssues: withIssues as Row[],
      },
    };
  });

export const getWarehouseMetricsHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        warehouseId: z.string().uuid(),
        days: z.number().optional().default(30),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - data.days);

    const { data: metrics, error } = await supabaseAdmin
      .from("warehouse_metrics")
      .select("*")
      .eq("warehouse_id", data.warehouseId)
      .gte("metric_date", startDate.toISOString().split("T")[0])
      .order("metric_date", { ascending: true });

    if (error) throw error;

    return { metrics: (metrics ?? []) as Row[] };
  });

/* ---------------- Technician Performance ---------------- */

export const getTechnicianPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get technician performance from view
    const { data: technicians, error } = await supabaseAdmin
      .from("technician_performance_v" as never)
      .select("*")
      .order("completed_installations", { ascending: false });

    if (error) throw error;

    return { technicians: (technicians ?? []) as Row[] };
  });

/* ---------------- Bug Reports from Admin Users ---------------- */

export const getBugReportsFromAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        limit: z.number().optional().default(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get bug reports from activity_logs with severity error/critical
    const { data: bugs, error } = await supabaseAdmin
      .from("activity_logs")
      .select(
        `
        *,
        reporter:profiles!activity_logs_user_id_fkey(
          id,
          name,
          email,
          business_type
        )
      `,
      )
      .in("severity", ["error", "critical"])
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) throw error;

    // Group by severity
    const critical = (bugs ?? []).filter((b: any) => b.severity === "critical");
    const errors = (bugs ?? []).filter((b: any) => b.severity === "error");

    return {
      bugs: (bugs ?? []) as Row[],
      counts: {
        total: (bugs ?? []).length,
        critical: critical.length,
        errors: errors.length,
      },
    };
  });

/* ---------------- Comprehensive Reporting Dashboard Data ---------------- */

export const getPlatformReportingDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);

    // Fetch all data in parallel
    const [feedbackRes, warehouseRes, techRes, bugsRes] = await Promise.all([
      getCustomerFeedback({ data: { limit: 50 } }),
      getWarehouseOperationsMetrics(),
      getTechnicianPerformance(),
      getBugReportsFromAdmins({ data: { limit: 50 } }),
    ]);

    return {
      feedback: feedbackRes,
      warehouses: warehouseRes,
      technicians: techRes,
      bugs: bugsRes,
    };
  });
