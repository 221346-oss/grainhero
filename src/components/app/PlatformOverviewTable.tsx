import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type Column<T> = {
  key: keyof T | string;
  label: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
};

/** Compact cross-tenant leaderboard table for platform views. */
export function PlatformOverviewTable<T extends { admin_id: string; name: string }>({
  title,
  description,
  rows,
  columns,
  emptyLabel = "No data across tenants yet.",
  limit = 10,
}: {
  title: string;
  description?: string;
  rows: T[];
  columns: Column<T>[];
  emptyLabel?: string;
  limit?: number;
}) {
  const visible = rows.slice(0, limit);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
          <Badge variant="outline" className="text-[10px]">{rows.length} tenants</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {visible.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">{emptyLabel}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-y border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs uppercase text-slate-500 font-semibold">Tenant</th>
                  {columns.map((c) => (
                    <th
                      key={String(c.key)}
                      className={`px-4 py-2 text-xs uppercase text-slate-500 font-semibold ${c.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.admin_id} className="border-0 hover:bg-muted/40">
                    <td className="px-4 py-2 font-medium text-slate-900 truncate max-w-[220px]">{row.name}</td>
                    {columns.map((c) => (
                      <td
                        key={String(c.key)}
                        className={`px-4 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > limit && (
          <div className="p-2 text-center text-xs text-slate-500 border-t border-slate-100">
            Showing top {limit} of {rows.length}
          </div>
        )}
      </CardContent>
    </Card>
  );
}