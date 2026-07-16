import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("plan_prices")
      .select("*")
      .order("plan_id");
    if (error) throw error;
    return data ?? [];
  });

export const Route = createFileRoute("/_authenticated/platform/plans")({
  component: PlatformPlansPage,
});

function PlatformPlansPage() {
  const fetchPlans = useServerFn(listPlans);
  const { data, isLoading } = useQuery({ queryKey: ["platform-plans"], queryFn: () => fetchPlans() });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Subscription Plans</h2>
        <p className="text-xs text-slate-500 mt-1">Manage plan pricing, feature limits, and Stripe price IDs.</p>
      </div>

      {isLoading && <div className="text-sm text-slate-500">Loading plans…</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((p) => {
          const features = (p.features ?? {}) as Record<string, unknown>;
          return (
            <Card key={p.plan_id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{p.plan_id}</CardTitle>
                  {p.is_active ? <Badge className="bg-emerald-600">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                </div>
                {p.annual_price_cents ? (
                  <div className="text-xs text-slate-500">${((p.annual_price_cents ?? 0) / 100).toFixed(2)}/yr</div>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-slate-600">
                {p.stripe_price_id_monthly && <div><span className="font-semibold">Monthly:</span> {p.stripe_price_id_monthly}</div>}
                {p.stripe_price_id_annual && <div><span className="font-semibold">Annual:</span> {p.stripe_price_id_annual}</div>}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  {Object.entries(features).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-slate-500">{k}</span>
                      <span className="font-medium text-slate-800">{String(v)}</span>
                    </div>
                  ))}
                  {Object.keys(features).length === 0 && (
                    <div className="text-slate-400 italic flex items-center gap-1"><Sparkles className="h-3 w-3" /> No feature flags configured</div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="text-sm text-slate-500 col-span-full">No plans yet.</div>
        )}
      </div>
    </div>
  );
}