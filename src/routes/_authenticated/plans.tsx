import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import pricingData from "@/lib/pricing-data";

export const Route = createFileRoute("/_authenticated/plans")({
  component: PlansPage,
});

function PlansPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Plans &amp; Pricing</h1>
        <p className="text-sm text-slate-500 mt-1">Choose the plan that fits your grain operation.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pricingData.map((p: any) => (
          <Card key={p.id} className={p.popular ? "border-emerald-500 shadow-lg relative" : ""}>
            {p.popular && (
              <Badge className="absolute -top-2 right-4 bg-emerald-600"><Sparkles className="h-3 w-3 mr-1" />Popular</Badge>
            )}
            <CardHeader>
              <CardTitle className="text-lg">{p.name}</CardTitle>
              <CardDescription className="text-xs">{p.description}</CardDescription>
              <div className="pt-2">
                <div className="text-3xl font-bold text-slate-900">{p.priceFrontend}</div>
                {p.iotChargeLabel && <div className="text-[10px] text-slate-500 mt-1">+ {p.iotChargeLabel}</div>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5">
                {p.features.map((f: string) => (
                  <li key={f} className="text-sm text-slate-700 flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full" variant={p.popular ? "default" : "outline"}>
                <Link to="/checkout" search={{ plan: p.id } as never}>Subscribe</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}