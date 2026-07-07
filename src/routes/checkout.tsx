import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, Shield, Clock, CreditCard, Cpu, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import pricingData from "@/lib/pricing-data";
import { supabase } from "@/integrations/supabase/client";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout.functions";

const search = z.object({
  plan: z.enum(["basic", "intermediate", "pro"]).optional(),
  canceled: z.union([z.literal("1"), z.literal(1)]).optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Checkout — GrainHero" },
      { name: "description", content: "Choose your plan and start monitoring your grain." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { plan: initial, canceled } = Route.useSearch();
  const [selected, setSelected] = useState<string>(initial ?? "intermediate");
  const [iotQuantity, setIotQuantity] = useState(1);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  useEffect(() => {
    if (canceled) toast("Checkout canceled. You can pick a plan and try again.");
  }, [canceled]);

  const startFn = useServerFn(createStripeCheckoutSession);
  const start = useMutation({
    mutationFn: () => startFn({ data: { planId: selected as "basic" | "intermediate" | "pro", iotQuantity } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e: Error) => toast.error(e.message ?? "Could not start checkout"),
  });

  const planData = pricingData.find((p) => p.id === selected);

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)" }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <Link to="/auth/login" className="text-sm text-slate-600 hover:text-slate-900">
            Already have an account? Sign in
          </Link>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Choose your plan</h1>
          <p className="text-slate-600 mt-2">You can change or cancel anytime.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {pricingData.map((p) => {
            const isSel = p.id === selected;
            return (
              <Card
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`cursor-pointer transition ${isSel ? "border-emerald-500 ring-2 ring-emerald-200 shadow-lg" : "hover:border-slate-300"}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    {p.popular && <Badge className="bg-emerald-600">Popular</Badge>}
                  </div>
                  <CardDescription className="text-xs">{p.description}</CardDescription>
                  <div className="pt-2">
                    <div className="text-2xl font-bold text-slate-900">{p.priceFrontend}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-xs">
                    {p.features.slice(0, 5).map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-slate-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">IoT sensor setup</CardTitle>
              <CardDescription>One-time hardware install per unit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Cpu className="h-5 w-5 text-amber-600" />
                <label htmlFor="iot-qty" className="text-sm">Quantity</label>
                <input
                  id="iot-qty"
                  type="number"
                  min={0}
                  max={50}
                  value={iotQuantity}
                  onChange={(e) => setIotQuantity(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                  className="w-20 h-9 px-2 rounded border border-slate-200 text-sm"
                />
                <span className="text-xs text-slate-500">
                  × Rs. 7,000 = Rs. {(iotQuantity * 7000).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {planData && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>{planData.name}</span>
                    <span>Rs. {planData.price.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IoT setup × {iotQuantity}</span>
                    <span>Rs. {(iotQuantity * 7000).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-emerald-600" /> Secure payment via Stripe
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" /> Instant activation
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Cancel anytime
                    </div>
                  </div>
                  {authed ? (
                    <Button
                      className="w-full bg-[#00a63e] hover:bg-[#029238] text-white"
                      disabled={start.isPending}
                      onClick={() => start.mutate()}
                    >
                      {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Proceed to payment"}
                    </Button>
                  ) : (
                    <Button asChild className="w-full bg-[#00a63e] hover:bg-[#029238] text-white">
                      <Link
                        to="/auth/signup"
                        search={{ plan: selected } as never}
                      >
                        Sign up to continue
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}