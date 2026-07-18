import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, FileText, ShieldCheck, ShieldAlert, ShieldX, Coins, MessageSquare } from "lucide-react";
import { getClaimTimeline } from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/insurance-claims/$claimId")({
  component: ClaimTimelinePage,
});

const EVENT_ICON: Record<string, React.ReactNode> = {
  submitted: <FileText className="h-4 w-4 text-blue-600" />,
  evidence_added: <FileText className="h-4 w-4 text-slate-500" />,
  decision_under_review: <Clock className="h-4 w-4 text-amber-600" />,
  decision_approved: <ShieldCheck className="h-4 w-4 text-emerald-600" />,
  decision_rejected: <ShieldX className="h-4 w-4 text-red-600" />,
  decision_paid: <Coins className="h-4 w-4 text-emerald-700" />,
  decision_cancelled: <ShieldAlert className="h-4 w-4 text-slate-500" />,
};

function eventTitle(t: string): string {
  if (t.startsWith("webhook_")) return `Carrier webhook · ${t.replace("webhook_", "")}`;
  if (t.startsWith("decision_")) return `Decision · ${t.replace("decision_", "")}`;
  return t.replace(/_/g, " ");
}

function ClaimTimelinePage() {
  const { claimId } = Route.useParams();
  const load = useServerFn(getClaimTimeline);
  const { data, isLoading } = useQuery({
    queryKey: ["claim-timeline", claimId],
    queryFn: () => load({ data: { claim_id: claimId } }),
  });

  const claim = data?.claim;
  const events = data?.events ?? [];
  const attachments = data?.attachments ?? [];

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Link to="/insurance" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to insurance
      </Link>

      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Claim timeline</h1>
        <p className="text-sm text-slate-500 mt-1">
          Every status change, decision, and carrier webhook update for this claim.
        </p>
      </div>

      {isLoading ? (
        <div className="text-slate-500 text-sm">Loading timeline…</div>
      ) : !claim ? (
        <Card><CardContent className="p-8 text-center text-slate-400">Claim not found or you don't have access.</CardContent></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-base">Claim details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Status">
                <Badge className="capitalize bg-emerald-100 text-emerald-700 border-emerald-200">
                  {claim.status}
                </Badge>
              </Row>
              <Row label="Type">{claim.claim_type ?? "—"}</Row>
              <Row label="Carrier">{claim.policy?.product?.carrier?.name ?? "—"}</Row>
              <Row label="Product">{claim.policy?.product?.name ?? "—"}</Row>
              <Row label="Requested">
                {formatMoney(claim.requested_payout_cents ?? claim.amount_claimed * 100, claim.currency)}
              </Row>
              <Row label="Approved">
                {formatMoney(claim.approved_payout_cents ?? (claim.amount_approved ?? 0) * 100, claim.currency)}
              </Row>
              <Row label="Opened">{new Date(claim.created_at).toLocaleString()}</Row>
              {claim.decided_at && <Row label="Decided">{new Date(claim.decided_at).toLocaleString()}</Row>}
              {claim.paid_at && <Row label="Paid">{new Date(claim.paid_at).toLocaleString()}</Row>}
              {claim.decision_reason && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-slate-500 mb-1">Decision reason</div>
                  <div className="text-sm">{claim.decision_reason}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <div className="text-slate-400 text-sm py-8 text-center">No events yet.</div>
                ) : (
                  <ol className="relative border-l-2 border-emerald-200 ml-3 space-y-4">
                    {events.map((e) => (
                      <li key={e.id} className="ml-6">
                        <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        </span>
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">{EVENT_ICON[e.event_type] ?? <MessageSquare className="h-4 w-4 text-slate-500" />}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium capitalize">{eventTitle(e.event_type)}</div>
                            <div className="text-[11px] text-slate-400">{new Date(e.created_at).toLocaleString()}</div>
                            {e.payload && Object.keys(e.payload).length > 0 && (
                              <pre className="text-[11px] text-slate-600 bg-slate-50 border rounded p-2 mt-1 overflow-auto max-h-40">
{JSON.stringify(e.payload, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Evidence ({attachments.length})</CardTitle></CardHeader>
              <CardContent>
                {attachments.length === 0 ? (
                  <div className="text-slate-400 text-sm text-center py-6">No attachments uploaded.</div>
                ) : (
                  <ul className="text-sm divide-y">
                    {attachments.map((a) => (
                      <li key={a.id} className="py-2 flex items-center justify-between">
                        <span className="truncate">{a.file_path?.split("/").pop() ?? a.file_path}</span>
                        <span className="text-[11px] text-slate-400">
                          {a.size_bytes ? `${Math.round(a.size_bytes / 1024)} KB` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-800">{children}</span>
    </div>
  );
}

function formatMoney(cents: number | null | undefined, currency: string | null | undefined) {
  const value = Number(cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(value);
  } catch {
    return `${(currency ?? "USD")} ${value.toFixed(2)}`;
  }
}