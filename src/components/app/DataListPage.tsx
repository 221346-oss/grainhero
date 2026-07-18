import { useQuery } from "@tanstack/react-query";
import { Loader2, Inbox } from "lucide-react";
import { PageHeader } from "@/components/dashboards/_shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
};

export function DataListPage<T extends Record<string, unknown>>({
  title, subtitle, badge, queryKey, queryFn, columns,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  queryKey: string;
  queryFn: () => Promise<T[]>;
  columns: Column<T>[];
}) {
  const { data, isLoading, error } = useQuery({ queryKey: [queryKey], queryFn });
  const rows = data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader title={title} subtitle={subtitle} badge={badge ?? (isLoading ? "…" : `${rows.length}`)} />

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
        </div>
      ) : error ? (
        <Card className="border-rose-200">
          <CardContent className="py-8 text-center text-rose-600 text-sm">
            {(error as Error).message}
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white/50">
          <CardContent className="py-16 flex flex-col items-center text-slate-500">
            <Inbox className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No records yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="">
                {rows.map((row, i) => (
                  <tr key={(row.id as string) ?? i} className="hover:bg-slate-50/50">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-slate-700">
                        {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const colors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    online: "bg-emerald-100 text-emerald-700",
    stored: "bg-emerald-100 text-emerald-700",
    processing: "bg-sky-100 text-sky-700",
    open: "bg-amber-100 text-amber-700",
    critical: "bg-rose-100 text-rose-700",
    high: "bg-rose-100 text-rose-700",
    offline: "bg-slate-200 text-slate-600",
    error: "bg-rose-100 text-rose-700",
    dispatched: "bg-violet-100 text-violet-700",
    sold: "bg-violet-100 text-violet-700",
  };
  const cls = colors[value.toLowerCase()] ?? "bg-slate-100 text-slate-700";
  return <Badge className={`${cls} hover:${cls}`}>{value}</Badge>;
}