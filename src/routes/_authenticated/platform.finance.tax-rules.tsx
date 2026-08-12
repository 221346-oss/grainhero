import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TaxRulesSkeleton } from "@/components/app/skeletons";
import { listTaxRules, upsertTaxRule, archiveTaxRule } from "@/lib/tax.functions";

export const Route = createFileRoute("/_authenticated/platform/finance/tax-rules")({
  head: () => ({
    meta: [
      { title: "Platform · Finance · Tax Rules — Grain Hero" },
      { name: "description", content: "Platform · Finance · Tax Rules workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Finance · Tax Rules — Grain Hero" },
      { property: "og:description", content: "Platform · Finance · Tax Rules workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TaxRulesPage,
});

function TaxRulesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listTaxRules);
  const save = useServerFn(upsertTaxRule);
  const archive = useServerFn(archiveTaxRule);
  const { data, isLoading } = useQuery({ queryKey: ["tax-rules"], queryFn: () => list() });
  const [form, setForm] = useState<{ region: string; ratePct: number; ruleType: "vat" | "gst" | "sales" | "withholding"; appliesTo: "buyer" | "seller" | "platform_fee" }>({
    region: "", ratePct: 0, ruleType: "vat", appliesTo: "buyer",
  });
  if (isLoading) return <AdminPageShell title="Tax Rules" subtitle="Region-based tax rates driving invoices and payouts."><TaxRulesSkeleton /></AdminPageShell>;

  async function submit() {
    if (!form.region) return toast.error("Region required");
    try {
      await save({ data: { region: form.region, ratePct: Number(form.ratePct), ruleType: form.ruleType, appliesTo: form.appliesTo } });
      toast.success("Saved");
      setForm({ region: "", ratePct: 0, ruleType: "vat", appliesTo: "buyer" });
      qc.invalidateQueries();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <AdminPageShell 
      title="Tax Rules" 
      subtitle="Region-based tax rates driving invoices and payouts."
    >
      <div className="space-y-6 max-w-[1400px]">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Add rule</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div><Label className="text-xs">Region</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="US-CA, PK, EU" /></div>
          <div><Label className="text-xs">Rate %</Label><Input type="number" step="0.01" value={form.ratePct} onChange={(e) => setForm({ ...form, ratePct: Number(e.target.value) })} /></div>
          <div>
            <Label className="text-xs">Type</Label>
            <select value={form.ruleType} onChange={(e) => setForm({ ...form, ruleType: e.target.value as typeof form.ruleType })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="vat">VAT</option><option value="gst">GST</option><option value="sales">Sales</option><option value="withholding">Withholding</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Applies to</Label>
            <select value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value as typeof form.appliesTo })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="buyer">Buyer</option><option value="seller">Seller</option><option value="platform_fee">Platform fee</option>
            </select>
          </div>
          <div className="flex items-end"><Button onClick={submit} className="w-full">Add</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Existing rules</CardTitle></CardHeader>
        <CardContent className="p-0">
          {(data?.rows ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No rules configured.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Region</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-left">Applies to</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((r: any) => (
                  <tr key={r.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-medium">{r.region}</td>
                    <td className="p-3 uppercase text-xs">{r.rule_type}</td>
                    <td className="p-3 text-right font-mono">{Number(r.rate_pct)}%</td>
                    <td className="p-3">{r.applies_to}</td>
                    <td className="p-3"><Badge variant={r.active ? "default" : "secondary"}>{r.active ? "active" : "archived"}</Badge></td>
                    <td className="p-3 text-right">
                      {r.active && <Button size="sm" variant="ghost" onClick={async () => { await archive({ data: { id: r.id } }); toast.success("Archived"); qc.invalidateQueries(); }}>Archive</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminPageShell>
  );
}