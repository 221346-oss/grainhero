import { createFileRoute } from "@tanstack/react-router";
import { VariableFontText } from "@/components/app/VariableFontText";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { RevenueSection } from "@/components/business/RevenueSection";
import { Wallet, Download, FileSpreadsheet, FileText, MoreHorizontal } from "lucide-react";
import { getRevenueOverview, getMySubscription } from "@/lib/billing.functions";
import { RevenueChart } from "@/components/business/RevenueChart";
import { getMyRole } from "@/lib/roles.functions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { downloadCsv, downloadPdf, type ExportColumn } from "@/lib/csv-pdf-export";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/_authenticated/business")({
  head: () => ({
    meta: [
      { title: "Business — Grain Hero" },
      {
        name: "description",
        content: "Business workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Business — Grain Hero" },
      { property: "og:description", content: "Business workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BusinessWorkspace,
});

type Tab = "revenue";

function getTabs(t: (key: string) => string): { key: Tab; label: string; icon: ComponentType<{ className?: string }> }[] {
  return [{ key: "revenue", label: t("business.revenue"), icon: Wallet }];
}

function money(n: number) {
  return `PKR ${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function BusinessWorkspace() {
  const [activeTab, setActiveTab] = useState<Tab>("revenue");
  const { t } = useTranslation();
  const TABS = getTabs(t);

  const fetchRevenue = useServerFn(getRevenueOverview);
  const fetchSub = useServerFn(getMySubscription);
  const fetchRole = useServerFn(getMyRole);

  const { data: revenue } = useQuery({ queryKey: ["revenue"], queryFn: () => fetchRevenue() });
  const { data: mySub } = useQuery({ queryKey: ["my-subscription"], queryFn: () => fetchSub() });
  const { data: roleData } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const role = roleData?.role ?? "pending";

  const totals = revenue?.totals ?? {
    invoiced: 0,
    paid: 0,
    collected: 0,
    outstanding: 0,
    overdue: 0,
    countInvoices: 0,
    countPayments: 0,
    due: 0,
  };
  const invoices = revenue?.invoices ?? [];
  const payments = revenue?.payments ?? [];
  const outstandingDispatches = revenue?.outstandingDispatches ?? [];

  const collectedPct =
    totals.invoiced > 0 ? Math.min(100, (totals.collected / totals.invoiced) * 100) : 0;
  const outstandingPct =
    totals.invoiced > 0 ? Math.min(100, (totals.outstanding / totals.invoiced) * 100) : 0;
  const overduePct =
    totals.countInvoices > 0 ? Math.min(100, (totals.overdue / totals.countInvoices) * 100) : 0;

  // Datasets for export
  const invoicedExportColumns: ExportColumn<any>[] = [
    { header: "Invoice #", value: (i) => i.invoice_number ?? "—" },
    { header: "Buyer", value: (i) => i.buyer_name ?? i.buyer_company ?? "—" },
    {
      header: "Batch / Dispatch",
      value: (i) => i.batch_ref ?? i.grain_dispatches?.dispatch_number ?? "—",
    },
    { header: "Total Amount (PKR)", value: (i) => Number(i.total_amount || 0).toLocaleString() },
    { header: "Amount Paid (PKR)", value: (i) => Number(i.amount_paid || 0).toLocaleString() },
    { header: "Status", value: (i) => i.payment_status ?? "pending" },
    {
      header: "Due Date",
      value: (i) => (i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"),
    },
    { header: "Issued Date", value: (i) => new Date(i.created_at).toLocaleDateString() },
  ];

  const collectedPayments = payments.filter((p: any) => (p.status ?? "completed") === "completed");
  const collectedExportColumns: ExportColumn<any>[] = [
    { header: "Payment Ref", value: (p) => p.payment_reference ?? "—" },
    { header: "Method", value: (p) => p.payment_method ?? "—" },
    { header: "Amount (PKR)", value: (p) => Number(p.amount || 0).toLocaleString() },
    { header: "Status", value: (p) => p.status ?? "completed" },
    {
      header: "Payment Date",
      value: (p) => (p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"),
    },
    { header: "Dispatch #", value: (p) => p.grain_dispatches?.dispatch_number ?? "—" },
  ];

  const outstandingInvoices = invoices.filter(
    (i: any) => Math.max(0, Number(i.total_amount || 0) - Number(i.amount_paid || 0)) > 0,
  );
  const outstandingExportRows = [
    ...outstandingInvoices.map((i: any) => ({
      ref: i.invoice_number ?? "—",
      buyer: i.buyer_name ?? i.buyer_company ?? "—",
      total: Number(i.total_amount || 0),
      paid: Number(i.amount_paid || 0),
      outstanding: Math.max(0, Number(i.total_amount || 0) - Number(i.amount_paid || 0)),
      dueDate: i.due_date ? new Date(i.due_date).toLocaleDateString() : "—",
      status: i.payment_status ?? "unpaid",
    })),
    ...outstandingDispatches.map((d: any) => ({
      ref: d.dispatch_number ?? "—",
      buyer: d.buyers?.name ?? d.buyers?.company_name ?? "—",
      total: Number(d.total_amount || 0),
      paid: Number(d.paid || 0),
      outstanding: Number(d.remaining || 0),
      dueDate: d.dispatched_at ? new Date(d.dispatched_at).toLocaleDateString() : "—",
      status: "pending payment",
    })),
  ];
  const outstandingExportColumns: ExportColumn<any>[] = [
    { header: "Reference", value: (r) => r.ref },
    { header: "Buyer", value: (r) => r.buyer },
    { header: "Total Amount (PKR)", value: (r) => r.total.toLocaleString() },
    { header: "Amount Paid (PKR)", value: (r) => r.paid.toLocaleString() },
    { header: "Outstanding Due (PKR)", value: (r) => r.outstanding.toLocaleString() },
    { header: "Due / Dispatched Date", value: (r) => r.dueDate },
    { header: "Status", value: (r) => r.status },
  ];

  const overdueInvoices = invoices.filter(
    (i: any) =>
      (i.due_date && new Date(i.due_date) < new Date() && i.payment_status !== "paid") ||
      i.payment_status === "overdue",
  );
  const dueExportColumns: ExportColumn<any>[] = [
    { header: "Invoice #", value: (i) => i.invoice_number ?? "—" },
    { header: "Buyer", value: (i) => i.buyer_name ?? i.buyer_company ?? "—" },
    { header: "Total Amount (PKR)", value: (i) => Number(i.total_amount || 0).toLocaleString() },
    {
      header: "Amount Due (PKR)",
      value: (i) =>
        Math.max(0, Number(i.total_amount || 0) - Number(i.amount_paid || 0)).toLocaleString(),
    },
    {
      header: "Due Date",
      value: (i) => (i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"),
    },
    {
      header: "Overdue Days",
      value: (i) =>
        i.due_date
          ? `${Math.max(0, Math.floor((Date.now() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24)))} days`
          : "—",
    },
    { header: "Status", value: (i) => i.payment_status ?? "overdue" },
  ];

  const summaryExportRows = [
    {
      metric: "Invoiced",
      amount: totals.invoiced,
      count: `${totals.countInvoices} invoices`,
      pct: "100%",
      description: "Total billed revenue across all buyer invoices",
    },
    {
      metric: "Collected",
      amount: totals.collected,
      count: `${totals.countPayments} payments`,
      pct: `${collectedPct.toFixed(1)}%`,
      description: "Total completed payments collected",
    },
    {
      metric: "Outstanding",
      amount: totals.outstanding,
      count: `${outstandingExportRows.length} items`,
      pct: `${outstandingPct.toFixed(1)}%`,
      description: "Total invoiced revenue awaiting payment",
    },
    {
      metric: "Due / Overdue",
      amount: totals.due,
      count: `${totals.overdue} overdue`,
      pct: `${overduePct.toFixed(1)}%`,
      description: "Past due invoices requiring follow-up",
    },
  ];
  const summaryExportColumns: ExportColumn<any>[] = [
    { header: "Key Metric", value: (r) => r.metric },
    { header: "Total Amount", value: (r) => money(r.amount) },
    { header: "Count / Records", value: (r) => r.count },
    { header: "Share / Status", value: (r) => r.pct },
    { header: "Description", value: (r) => r.description },
  ];

  const stats = [
    {
      label: t("business.invoiced"),
      value: money(totals.invoiced),
      pct: totals.invoiced > 0 ? "100%" : "0.0%",
      width: totals.invoiced > 0 ? 100 : 0,
      up: true,
      color: "bg-emerald-500",
      exportCsv: () => downloadCsv("invoiced-revenue", invoices, invoicedExportColumns),
      exportPdf: () =>
        downloadPdf("invoiced-revenue", "Invoiced Revenue Report", invoices, invoicedExportColumns),
    },
    {
      label: t("business.collected"),
      value: money(totals.collected),
      pct: `${collectedPct.toFixed(1)}%`,
      width: collectedPct,
      up: true,
      color: "bg-emerald-500",
      exportCsv: () => downloadCsv("collected-payments", collectedPayments, collectedExportColumns),
      exportPdf: () =>
        downloadPdf(
          "collected-payments",
          "Collected Payments Report",
          collectedPayments,
          collectedExportColumns,
        ),
    },
    {
      label: t("business.outstanding"),
      value: money(totals.outstanding),
      pct: `${outstandingPct.toFixed(1)}%`,
      width: outstandingPct,
      up: false,
      color: "bg-amber-500",
      exportCsv: () =>
        downloadCsv("outstanding-balances", outstandingExportRows, outstandingExportColumns),
      exportPdf: () =>
        downloadPdf(
          "outstanding-balances",
          "Outstanding Balances Report",
          outstandingExportRows,
          outstandingExportColumns,
        ),
    },
    {
      label: t("business.due"),
      value: `${totals.overdue}`,
      pct: `${overduePct.toFixed(1)}%`,
      width: overduePct,
      up: totals.overdue === 0,
      color: totals.overdue === 0 ? "bg-emerald-500" : "bg-rose-500",
      exportCsv: () => downloadCsv("due-overdue-invoices", overdueInvoices, dueExportColumns),
      exportPdf: () =>
        downloadPdf(
          "due-overdue-invoices",
          "Due & Overdue Invoices Report",
          overdueInvoices,
          dueExportColumns,
        ),
    },
  ];

  return (
    <div
      className="min-h-screen bg-background p-4 md:p-8"
      style={{
        fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            <span dir="ltr" className="inline-block"><VariableFontText text={t("business.title")} base={650} hover={900} staggerMs={20} /></span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("business.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
              {t("business.businessOverview")}
            </p>
            <RevenueChart invoices={invoices} payments={payments} />
          </div>

          <div className="bg-card border border-border rounded-[2rem] p-6 lg:p-8 flex flex-col justify-between relative h-full">
            <div className="flex justify-between items-center mb-6 gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {t("business.keyMetrics")}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 border-border shadow-xs"
                  >
                    <Download className="h-3 w-3" />
                    <span>{t("common.export")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 text-xs p-1.5">
                  <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    {t("business.exportAllTogether")}
                  </DropdownMenuLabel>

                  {/* All Metrics Summary */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center justify-between gap-2 cursor-pointer text-xs px-2 py-1.5 rounded-sm">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-medium">{t("business.allMetricsSummary")}</span>
                      </div>
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="text-xs min-w-[130px] p-1">
                      <DropdownMenuItem
                        onClick={() =>
                          downloadCsv(
                            "financial-summary-all-metrics",
                            summaryExportRows,
                            summaryExportColumns,
                          )
                        }
                        className="gap-2 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                        Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          downloadPdf(
                            "financial-summary-all-metrics",
                            "Key Financial Metrics Summary",
                            summaryExportRows,
                            summaryExportColumns,
                          )
                        }
                        className="gap-2 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-rose-500" />
                        Export PDF
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator className="my-1.5" />

                  <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    {t("business.exportDatasets")}
                  </DropdownMenuLabel>

                  {/* Invoiced */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center justify-between gap-2 cursor-pointer text-xs px-2 py-1.5 rounded-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                        <span className="font-medium">{t("business.invoiced")}</span>
                      </div>
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="text-xs min-w-[130px] p-1">
                      <DropdownMenuItem
                        onClick={() =>
                          downloadCsv("invoiced-revenue", invoices, invoicedExportColumns)
                        }
                        className="gap-2 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                        Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          downloadPdf(
                            "invoiced-revenue",
                            "Invoiced Revenue Report",
                            invoices,
                            invoicedExportColumns,
                          )
                        }
                        className="gap-2 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-rose-500" />
                        Export PDF
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Collected */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center justify-between gap-2 cursor-pointer text-xs px-2 py-1.5 rounded-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-medium">{t("business.collected")}</span>
                      </div>
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="text-xs min-w-[130px] p-1">
                      <DropdownMenuItem
                        onClick={() =>
                          downloadCsv(
                            "collected-payments",
                            collectedPayments,
                            collectedExportColumns,
                          )
                        }
                        className="gap-2 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                        Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          downloadPdf(
                            "collected-payments",
                            "Collected Payments Report",
                            collectedPayments,
                            collectedExportColumns,
                          )
                        }
                        className="gap-2 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-rose-500" />
                        Export PDF
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Outstanding */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center justify-between gap-2 cursor-pointer text-xs px-2 py-1.5 rounded-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-amber-600" />
                        <span className="font-medium">{t("business.outstanding")}</span>
                      </div>
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="text-xs min-w-[130px] p-1">
                      <DropdownMenuItem
                        onClick={() =>
                          downloadCsv(
                            "outstanding-balances",
                            outstandingExportRows,
                            outstandingExportColumns,
                          )
                        }
                        className="gap-2 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                        Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          downloadPdf(
                            "outstanding-balances",
                            "Outstanding Balances Report",
                            outstandingExportRows,
                            outstandingExportColumns,
                          )
                        }
                        className="gap-2 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-rose-500" />
                        Export PDF
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Due / Overdue */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center justify-between gap-2 cursor-pointer text-xs px-2 py-1.5 rounded-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-red-600" />
                        <span className="font-medium">{t("business.due")} / {t("business.overdue")}</span>
                      </div>
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="text-xs min-w-[130px] p-1">
                      <DropdownMenuItem
                        onClick={() =>
                          downloadCsv("due-overdue-invoices", overdueInvoices, dueExportColumns)
                        }
                        className="gap-2 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                        Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          downloadPdf(
                            "due-overdue-invoices",
                            "Due & Overdue Invoices Report",
                            overdueInvoices,
                            dueExportColumns,
                          )
                        }
                        className="gap-2 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-rose-500" />
                        Export PDF
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-6 flex-1 flex flex-col justify-center mt-2">
              {stats.map((s, idx) => (
                <div key={s.label} className="w-full">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center w-[38%] min-w-[110px]">
                      <div className="truncate">
                        <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                        <p className="text-base font-black text-foreground truncate">{s.value}</p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center px-2">
                      <div className="w-full h-1 bg-muted rounded-full relative overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500 ${s.color}`}
                          style={{ width: `${s.width}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-muted-foreground font-mono w-10 text-right">
                        {s.pct}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs min-w-[140px]">
                          <DropdownMenuItem
                            onClick={() => s.exportCsv()}
                            className="gap-2 cursor-pointer"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Export CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => s.exportPdf()}
                            className="gap-2 cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5 text-rose-500" /> Export PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {idx < stats.length - 1 && <div className="h-px w-full bg-border mt-6" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="border-b border-border px-4 md:px-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-8">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex items-center gap-2 py-4 text-sm uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <VariableFontText
                      text={tab.label}
                      base={isActive ? 850 : 350}
                      hover={850}
                      staggerMs={30}
                    />
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-mono transition-colors ${isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground/60"}`}
                    >
                      {totals.countInvoices}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="business-tab-underline"
                        className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === "revenue" && <RevenueSection role={role as any} />}
          </div>
        </div>
      </div>
    </div>
  );
}
