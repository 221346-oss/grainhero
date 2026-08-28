/**
 * TypeScript interfaces and Zod schemas for the Super Admin Business Page
 * Covers revenue analytics, hardware orders, pinned tickets, and export data.
 */

import { z } from "zod";
import type { ReactNode } from "react";

// ── Revenue Analytics ─────────────────────────────────────────────────────────

export interface RevenueAnalytics {
  kpis: {
    mrr: number;
    arr: number;
    totalRevenue: number;
    activeCount: number;
    trialCount: number;
    cancelledCount: number;
    expiringCount: number;
    churnRate: number;
  };
  revenueSeries: Array<{ month: string; revenue: number }>;
  planSeries: Array<{ plan: string; mrr: number }>;
  growth: Array<{ month: string; subscribers: number }>;
  expiring: Array<{
    id: string;
    admin_id: string;
    plan_name: string;
    end_date: string;
    status: string;
  }>;
  recentInvoices: Array<{
    id: string;
    admin_id: string;
    amount: number;
    currency: string;
    status: string;
    billing_date: string;
    invoice_number: string;
  }>;
  currency: string;
}

// ── Hardware Orders ───────────────────────────────────────────────────────────

export type HardwareOrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface HardwareOrderItem {
  id: string;
  admin_id: string;
  plan_name: string;
  hardware_quantity: number;
  hardware_total: number;
  currency: string;
  status: HardwareOrderStatus;
  created_at: string;
}

export interface HardwareOrders {
  orders: HardwareOrderItem[];
}

// ── Pinned Tickets ────────────────────────────────────────────────────────────

export type TicketPriority = "low" | "medium" | "high";
export type TicketStatus = "open" | "resolved" | "closed";
export type ReporterRole = "admin" | "manager" | "technician";

export interface PinnedTicketItem {
  id: string;
  admin_id: string;
  title: string;
  priority: TicketPriority;
  reporter_name: string;
  reporter_role: ReporterRole;
  description: string;
  status: TicketStatus;
  created_at: string;
  isPinned: boolean;
  admin_name?: string;
  admin_email?: string;
}

export interface PinnedTickets {
  tickets: PinnedTicketItem[];
}

// ── Export Data ───────────────────────────────────────────────────────────────

export type ExportFormat = "csv" | "pdf" | "html";

export interface ExportData {
  filename: string;
  format: ExportFormat;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  metadata?: {
    title: string;
    exportDate: string;
    generatedBy: string;
  };
}

// ── Component Props ───────────────────────────────────────────────────────────

export interface TrendIndicator {
  value: number;
  direction: "up" | "down" | "neutral";
  label: string;
}

export interface AnalyticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: TrendIndicator;
  icon?: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorFn: (row: T) => unknown;
  cell?: (value: unknown) => ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Array<ColumnDef<T>>;
  data: T[];
  title: string;
  exportable?: boolean;
  onExport?: (format: ExportFormat) => void;
  emptyMessage?: string;
}

export interface ExportButtonGroupProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  onExportHTML: () => void;
  disabled?: boolean;
}

// ── Zod Schemas ───────────────────────────────────────────────────────────────

/** ISO 8601 date string validator */
const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/, "Must be a valid ISO 8601 date");

/** ISO 4217 currency code validator (3 uppercase letters) */
const currencyCode = z.string().regex(/^[A-Z]{3}$/, "Must be a valid ISO 4217 currency code");

/** Export filename — alphanumeric, dashes, underscores only; no path traversal */
const safeFilename = z
  .string()
  .min(1)
  .max(200)
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Filename must contain only letters, numbers, dashes, and underscores",
  );

export const RevenueKpisSchema = z.object({
  mrr: z.number().nonnegative("MRR must be non-negative"),
  arr: z.number().nonnegative("ARR must be non-negative"),
  totalRevenue: z.number().nonnegative("Total revenue must be non-negative"),
  activeCount: z.number().int().nonnegative(),
  trialCount: z.number().int().nonnegative(),
  cancelledCount: z.number().int().nonnegative(),
  expiringCount: z.number().int().nonnegative(),
  churnRate: z
    .number()
    .min(0, "Churn rate cannot be negative")
    .max(100, "Churn rate cannot exceed 100"),
});

export const RevenueSeriesItemSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  revenue: z.number().nonnegative(),
});

export const PlanSeriesItemSchema = z.object({
  plan: z.string().min(1),
  mrr: z.number().nonnegative(),
});

export const GrowthItemSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  subscribers: z.number().int().nonnegative(),
});

export const ExpiringSubscriptionSchema = z.object({
  id: z.string().uuid(),
  admin_id: z.string().uuid(),
  plan_name: z.string().min(1),
  end_date: isoDateString,
  status: z.string().min(1),
});

export const RecentInvoiceSchema = z.object({
  id: z.string().uuid(),
  admin_id: z.string().uuid(),
  amount: z.number().nonnegative(),
  currency: currencyCode,
  status: z.string().min(1),
  billing_date: isoDateString,
  invoice_number: z.string().min(1),
});

export const RevenueAnalyticsSchema = z.object({
  kpis: RevenueKpisSchema,
  revenueSeries: z.array(RevenueSeriesItemSchema),
  planSeries: z.array(PlanSeriesItemSchema),
  growth: z.array(GrowthItemSchema),
  expiring: z.array(ExpiringSubscriptionSchema),
  recentInvoices: z.array(RecentInvoiceSchema),
  currency: currencyCode,
});

export const HardwareOrderItemSchema = z.object({
  id: z.string().uuid(),
  admin_id: z.string().uuid(),
  plan_name: z.string().min(1),
  hardware_quantity: z.number().int().positive("Hardware quantity must be a positive integer"),
  hardware_total: z.number().nonnegative("Hardware total must be non-negative"),
  currency: currencyCode,
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
  created_at: isoDateString,
});

export const HardwareOrdersSchema = z.object({
  orders: z.array(HardwareOrderItemSchema),
});

export const PinnedTicketItemSchema = z.object({
  id: z.string().uuid(),
  admin_id: z.string().uuid(),
  title: z.string().min(3).max(200),
  priority: z.enum(["low", "medium", "high"]),
  reporter_name: z.string().min(1).max(120),
  reporter_role: z.enum(["admin", "manager", "technician"]),
  description: z.string().min(1).max(4000),
  status: z.enum(["open", "resolved", "closed"]),
  created_at: isoDateString,
  isPinned: z.boolean(),
  admin_name: z.string().optional().nullable(),
  admin_email: z.string().email().optional().nullable(),
});

export const PinnedTicketsSchema = z.object({
  tickets: z.array(PinnedTicketItemSchema),
});

export const ExportDataSchema = z.object({
  filename: safeFilename,
  format: z.enum(["csv", "pdf", "html"]),
  headers: z.array(z.string().min(1)),
  rows: z.array(z.record(z.string(), z.unknown())),
  metadata: z
    .object({
      title: z.string().min(1),
      exportDate: isoDateString,
      generatedBy: z.string().min(1),
    })
    .optional(),
});

// ── Type Guards ───────────────────────────────────────────────────────────────

/**
 * Validates and narrows an unknown value to RevenueAnalytics.
 * Returns null if validation fails.
 */
export function parseRevenueAnalytics(data: unknown): RevenueAnalytics | null {
  const result = RevenueAnalyticsSchema.safeParse(data);
  return result.success ? (result.data as RevenueAnalytics) : null;
}

/**
 * Validates and narrows an unknown value to HardwareOrders.
 * Returns null if validation fails.
 */
export function parseHardwareOrders(data: unknown): HardwareOrders | null {
  const result = HardwareOrdersSchema.safeParse(data);
  return result.success ? (result.data as HardwareOrders) : null;
}

/**
 * Validates and narrows an unknown value to PinnedTickets.
 * Returns null if validation fails.
 */
export function parsePinnedTickets(data: unknown): PinnedTickets | null {
  const result = PinnedTicketsSchema.safeParse(data);
  return result.success ? (result.data as PinnedTickets) : null;
}

/**
 * Validates and narrows an unknown value to ExportData.
 * Returns null if validation fails.
 */
export function parseExportData(data: unknown): ExportData | null {
  const result = ExportDataSchema.safeParse(data);
  return result.success ? (result.data as ExportData) : null;
}

/** Type guard: checks if a string is a valid ExportFormat */
export function isExportFormat(value: unknown): value is ExportFormat {
  return value === "csv" || value === "pdf" || value === "html";
}

/** Type guard: checks if a string is a valid TicketPriority */
export function isTicketPriority(value: unknown): value is TicketPriority {
  return value === "low" || value === "medium" || value === "high";
}

/** Type guard: checks if a string is a valid HardwareOrderStatus */
export function isHardwareOrderStatus(value: unknown): value is HardwareOrderStatus {
  return (
    value === "pending" ||
    value === "confirmed" ||
    value === "shipped" ||
    value === "delivered" ||
    value === "cancelled"
  );
}
