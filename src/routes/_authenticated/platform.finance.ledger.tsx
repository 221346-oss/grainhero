import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LedgerSkeleton } from "@/components/app/skeletons";
import { listLedgerEntries } from "@/lib/finance-ledger.functions";

export const Route = createFileRoute("/_authenticated/platform/finance/ledger")({
  head: () => ({
    meta: [
      { title: "Platform · Finance · Ledger — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Finance · Ledger workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Finance · Ledger — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Finance · Ledger workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LedgerPage,
});

const ENTRY_TYPES = [
  "",
  "payment_in",
  "refund_out",
  "platform_fee",
  "logistics_cost",
  "tax",
  "payout_out",
  "adjustment",
];

function LedgerPage() {
  const fn = useServerFn(listLedgerEntries);
  const [entryType, setEntryType] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["ledger", entryType],
    queryFn: () => fn({ data: entryType ? { entryType } : {} }),
  });
  if (isLoading)
    return (
      <AdminPageShell title="Ledger" subtitle="Append-only entries for every money movement.">
        <LedgerSkeleton />
      </AdminPageShell>
    );
  return (
    <AdminPageShell
      title="Ledger"
      subtitle="Append-only entries for every money movement."
      actions={
        <div className="flex gap-2 flex-wrap">
          {ENTRY_TYPES.map((t) => (
            <button
              key={t || "all"}
              onClick={() => setEntryType(t)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${entryType === t ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary/40"}`}
            >
              {t || "All"}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-6 max-w-[1400px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Entries ({data?.rows.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(data?.rows ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No entries.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3 text-left">When</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Dir</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Seller</th>
                      <th className="p-3 text-left">Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.rows ?? []).map((r: any) => (
                      <tr key={r.id} className="border-t hover:bg-muted/20">
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(r.occurred_at).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{r.entry_type}</Badge>
                        </td>
                        <td className="p-3">
                          <span
                            className={
                              r.direction === "credit" ? "text-emerald-600" : "text-rose-600"
                            }
                          >
                            {r.direction === "credit" ? "+" : "−"}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">
                          {r.currency} {Number(r.amount).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">{r.status}</Badge>
                        </td>
                        <td className="p-3 font-mono text-xs">{r.seller_id?.slice(0, 8) ?? "—"}</td>
                        <td className="p-3 font-mono text-xs">{r.order_id?.slice(0, 8) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
