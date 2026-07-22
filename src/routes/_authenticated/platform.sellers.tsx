import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listSellerRankings } from "@/lib/reputation.functions";

export const Route = createFileRoute("/_authenticated/platform/sellers")({
  component: PlatformSellersPage,
});

function PlatformSellersPage() {
  const load = useServerFn(listSellerRankings);
  const { data, isLoading } = useQuery({
    queryKey: ["seller-rankings"],
    queryFn: () => load({ data: { limit: 50 } }),
  });
  return (
    <AdminPageShell
      title="Seller reputation"
      subtitle="Every tenant admin ranked by fulfillment score. Weights and badges are configurable in Marketplace Settings."
    >
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading rankings…</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left border-b">
                <tr>
                  <th className="p-3">Seller</th>
                  <th>Score</th>
                  <th>Rating</th>
                  <th>Delivered</th>
                  <th>On-time</th>
                  <th>Disputes</th>
                  <th>Badges</th>
                </tr>
              </thead>
              <tbody>
                {(data?.sellers ?? []).map((s) => (
                  <tr key={s.admin_id} className="border-b last:border-0 hover:bg-emerald-50/40">
                    <td className="p-3">
                      <Link to="/admins/$adminId" params={{ adminId: s.admin_id }} className="font-medium text-slate-900 hover:underline">
                        {s.profile?.company_name || s.profile?.name || s.profile?.email || s.admin_id.slice(0, 8)}
                      </Link>
                      <div className="text-xs text-muted-foreground">{s.profile?.city ?? ""} {s.profile?.country ?? ""}</div>
                    </td>
                    <td>
                      <span className={s.score >= 75 ? "text-emerald-700 font-semibold" : s.score >= 40 ? "text-amber-700" : "text-rose-700"}>
                        {s.score}
                      </span>
                    </td>
                    <td>{Number(s.avg_rating || 0).toFixed(2)} ({s.review_count_total})</td>
                    <td>{s.delivered_count}</td>
                    <td>{Math.round((Number(s.on_time_rate) || 0) * 100)}%</td>
                    <td>{s.dispute_count} ({Math.round((Number(s.dispute_rate) || 0) * 100)}%)</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(s.badges ?? []).map((b: { key: string; label: string }) => (
                          <Badge key={b.key} variant="secondary" className="text-xs">{b.label}</Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.sellers ?? []).length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No sellers with delivered orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </AdminPageShell>
  );
}