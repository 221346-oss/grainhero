import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { listMyInstalls } from "@/lib/hardware-lifecycle.functions";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv, downloadPdf } from "@/lib/csv-pdf-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, MapPin, ChevronRight, Download, FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/technician/installs")({
  head: () => ({ meta: [{ title: "My installs — Technician" }] }),
  beforeLoad: async () => {
    // Only global (superadmin) technicians may access this page.
    // Tenant (admin) technicians are redirected to their dashboard.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw redirect({ to: "/auth/login" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("admin_id")
      .eq("id", session.user.id)
      .maybeSingle();
    if (profile?.admin_id != null) throw redirect({ to: "/dashboard" });
  },
  component: TechnicianInstallsPage,
});

const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-slate-200 text-slate-700",
  en_route: "bg-indigo-100 text-indigo-800",
  onsite: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-600 text-white",
  blocked: "bg-rose-100 text-rose-700",
};

function toExportRows(installs: any[]) {
  return installs.map((i) => {
    const o = (i.hardware_orders ?? {}) as Record<string, unknown>;
    return {
      "Order ID":        String(o.id ?? "").slice(0, 8) || "—",
      "Status":          (i.status as string ?? "—").replace("_", " "),
      "Scheduled for":   i.scheduled_for ? new Date(i.scheduled_for as string).toLocaleString() : "—",
      "City":            (o.install_city as string) ?? "—",
      "Country":         (o.install_country as string) ?? "—",
      "Plan":            (o.plan_name as string) ?? (o.plan_id as string) ?? "—",
      "Qty":             (o.hardware_quantity as number) ?? 0,
    };
  });
}

const INSTALL_EXPORT_COLS = [
  { header: "Order ID", value: (r: any) => r["Order ID"] },
  { header: "Status", value: (r: any) => r["Status"] },
  { header: "Scheduled for", value: (r: any) => r["Scheduled for"] },
  { header: "City", value: (r: any) => r["City"] },
  { header: "Country", value: (r: any) => r["Country"] },
  { header: "Plan", value: (r: any) => r["Plan"] },
  { header: "Qty", value: (r: any) => r["Qty"] },
];

function TechnicianInstallsPage() {
  const fetchFn = useServerFn(listMyInstalls);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["technician.installs"], queryFn: () => fetchFn() });

  // Realtime: invalidate when installs or orders change
  useEffect(() => {
    const channel = supabase
      .channel("tech-installs")
      .on("postgres_changes", { event: "*", schema: "public", table: "hardware_order_installations" }, () => {
        qc.invalidateQueries({ queryKey: ["technician.installs"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "hardware_orders" }, () => {
        qc.invalidateQueries({ queryKey: ["technician.installs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
  const installs = data?.installs ?? [];
  const [pdfBusy, setPdfBusy] = useState(false);

  const exportRows = toExportRows(installs);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My installations</h1>
          <p className="text-sm text-muted-foreground">Orders assigned to you for on-site installation.</p>
        </div>
        {/* Export buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            disabled={exportRows.length === 0}
            onClick={() => downloadCsv("my-installs", exportRows, INSTALL_EXPORT_COLS)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
          <button
            disabled={exportRows.length === 0 || pdfBusy}
            onClick={async () => {
              setPdfBusy(true);
              await downloadPdf("my-installs", "My installations", exportRows, INSTALL_EXPORT_COLS).catch(console.error);
              setPdfBusy(false);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <FileDown className="w-3 h-3" /> PDF
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="h-24 rounded-xl bg-muted animate-pulse" />
      ) : installs.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No installs assigned yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {installs.map((i) => {
            const o = (i.hardware_orders ?? {}) as Record<string, unknown>;
            return (
              <Link key={i.id as string} to="/technician/installs/$installId" params={{ installId: i.id as string }} className="block">
                <Card className="hover:border-emerald-400 transition-colors">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Order {(o.id as string)?.slice(0, 8) ?? "—"}</CardTitle>
                    <Badge className={STATUS_COLOR[i.status as string] ?? "bg-slate-200"}>{(i.status as string).replace("_", " ")}</Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
                    {i.scheduled_for && <span className="inline-flex items-center gap-1"><CalendarClock className="h-4 w-4" />{new Date(i.scheduled_for as string).toLocaleString()}</span>}
                    {(o.install_city as string) && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{o.install_city as string}</span>}
                    <span className="ml-auto inline-flex items-center gap-1 text-emerald-700">Open <ChevronRight className="h-4 w-4" /></span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
