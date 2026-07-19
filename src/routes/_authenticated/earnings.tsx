import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EarningsSkeleton } from "@/components/app/skeletons";
import { getSellerBalance, listLedgerEntries } from "@/lib/finance-ledger.functions";
import { listPayouts, getMyPayoutAccount, upsertPayoutAccount } from "@/lib/payouts.functions";
import { Wallet, Clock, CheckCircle2, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/earnings")({
  component: EarningsPage,
});

function EarningsPage() {
  const qc = useQueryClient();
  const bal = useServerFn(getSellerBalance);
  const ledger = useServerFn(listLedgerEntries);
  const payouts = useServerFn(listPayouts);
  const acct = useServerFn(getMyPayoutAccount);
  const saveAcct = useServerFn(upsertPayoutAccount);

  const { data: balance, isLoading: l1 } = useQuery({ queryKey: ["my-balance"], queryFn: () => bal({ data: {} }) });
  const { data: entries } = useQuery({ queryKey: ["my-ledger"], queryFn: () => ledger({ data: { limit: 50 } }) });
  const { data: payoutList } = useQuery({ queryKey: ["my-payouts"], queryFn: () => payouts({ data: {} }) });
  const { data: acctData } = useQuery({ queryKey: ["my-payout-account"], queryFn: () => acct() });

  const [form, setForm] = useState({ method: "bank_transfer", bankName: "", accountHolder: "", accountNumber: "", iban: "", swift: "", country: "" });

  if (l1 || !balance) return <EarningsSkeleton />;
  const cur = balance.currency;
  const tiles = [
    { label: "Payable now", value: balance.payable, icon: Wallet },
    { label: "On hold", value: balance.onHold, icon: Clock },
    { label: "Paid out", value: balance.paidOut, icon: CheckCircle2 },
    { label: "Refunded", value: balance.refunded, icon: TrendingDown },
  ];

  async function savePayoutAccount() {
    try {
      await saveAcct({ data: form });
      toast.success("Payout account saved");
      qc.invalidateQueries({ queryKey: ["my-payout-account"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Earnings</h1>
        <p className="text-sm text-muted-foreground mt-1">Your payable balance, payout history, and account details.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wide">
                <span>{t.label}</span><t.icon className="h-3.5 w-3.5" />
              </div>
              <div className="text-xl font-bold tabular-nums">{cur} {Number(t.value).toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Payout account</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {acctData?.account ? (
            <div className="text-sm text-muted-foreground">
              Method: <span className="text-foreground font-medium">{acctData.account.method}</span> • {acctData.account.bank_name ?? "—"} • {acctData.account.currency}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No payout account yet. Add one below to receive payments.</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label className="text-xs">Bank name</Label><Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></div>
            <div><Label className="text-xs">Account holder</Label><Input value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} /></div>
            <div><Label className="text-xs">Account #</Label><Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></div>
            <div><Label className="text-xs">IBAN</Label><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></div>
            <div><Label className="text-xs">SWIFT</Label><Input value={form.swift} onChange={(e) => setForm({ ...form, swift: e.target.value })} /></div>
            <div><Label className="text-xs">Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <Button size="sm" onClick={savePayoutAccount}>Save account</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Payout history</CardTitle></CardHeader>
        <CardContent className="p-0">
          {(payoutList?.rows ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No payouts yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Amount</th><th className="p-3 text-left">Reference</th></tr>
              </thead>
              <tbody>
                {(payoutList?.rows ?? []).map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 text-xs text-muted-foreground">{new Date(p.paid_at ?? p.created_at).toLocaleDateString()}</td>
                    <td className="p-3"><Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge></td>
                    <td className="p-3 text-right font-mono">{p.currency} {Number(p.net_amount).toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground">{p.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Recent ledger activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {(entries?.rows ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No activity yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-3 text-left">When</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Amount</th><th className="p-3 text-left">Status</th></tr>
              </thead>
              <tbody>
                {(entries?.rows ?? []).map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 text-xs text-muted-foreground">{new Date(r.occurred_at).toLocaleString()}</td>
                    <td className="p-3"><Badge variant="outline">{r.entry_type}</Badge></td>
                    <td className="p-3 text-right font-mono">{r.direction === "credit" ? "+" : "−"} {r.currency} {Number(r.amount).toLocaleString()}</td>
                    <td className="p-3"><Badge variant="secondary">{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}