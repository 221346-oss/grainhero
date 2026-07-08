import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  Truck,
  ArrowRight,
  PartyPopper,
  UserPlus,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyOnboardingStatus } from "@/lib/onboarding-status.functions";
import { claimPaidCheckoutForUser, getCheckoutSessionSummary } from "@/lib/stripe-checkout.functions";
import { getAuthRedirectOrigin } from "@/lib/app-url";

const search = z.object({
  session_id: z.string().optional(),
});

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Welcome to GrainHero 🎉" },
      { name: "description", content: "Your payment is confirmed. Let's finish setting up your account." },
    ],
  }),
  component: SuccessPage,
});

/** Lightweight confetti burst that runs entirely on the client. */
function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const colors = ["#00a63e", "#22c55e", "#84cc16", "#eab308", "#0ea5e9", "#8b5cf6", "#f43f5e"];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      r: 4 + Math.random() * 6,
      c: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.15 + Math.random() * 0.3,
    }));
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        ctx.restore();
      }
      if (t - t0 < 6000) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

function StepRow({
  done,
  icon,
  title,
  desc,
  action,
}: {
  done: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition ${
          done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {done ? <CheckCircle2 className="h-5 w-5" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-slate-900 text-sm">{title}</p>
          {done && <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">Done</Badge>}
        </div>
        <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
        {!done && action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

function SuccessPage() {
  const navigate = useNavigate();
  const { session_id: sessionId } = Route.useSearch();
  const statusFn = useServerFn(getMyOnboardingStatus);
  const summaryFn = useServerFn(getCheckoutSessionSummary);
  const claimFn = useServerFn(claimPaidCheckoutForUser);
  const [resending, setResending] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => statusFn(),
    enabled: signedIn === true,
    refetchInterval: (q) => {
      const d = q.state.data;
      // Poll every 3s until the webhook flips the subscription to active.
      if (!d) return 3000;
      return d.subscriptionActive ? false : 3000;
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["checkout-session-summary", sessionId],
    queryFn: () => summaryFn({ data: { sessionId: sessionId! } }),
    enabled: Boolean(sessionId),
  });

  useEffect(() => {
    if (signedIn !== true || !sessionId || claiming) return;
    setClaiming(true);
    claimFn({ data: { sessionId } })
      .then(() => query.refetch())
      .catch((e) => toast.error((e as Error).message ?? "Could not link payment to your account"))
      .finally(() => setClaiming(false));
  }, [claimFn, claiming, query, sessionId, signedIn]);

  const s = query.data;
  const summary = summaryQuery.data;
  const paymentDone = Boolean(s?.subscriptionActive || summary?.paid);
  const emailDone = Boolean(s?.emailVerified);
  const allDone = paymentDone && emailDone;

  // Once we've confirmed the subscription is live, drop the saved checkout draft.
  useEffect(() => {
    if (paymentDone && typeof window !== "undefined") {
      try { window.localStorage.removeItem("grainhero.checkoutDraft.v1"); } catch { /* ignore */ }
    }
  }, [paymentDone]);

  const planLabel = useMemo(() => {
    const raw = (s?.subscription as { plan_name?: string } | null)?.plan_name;
    return raw ? String(raw).replace(/_/g, " ") : null;
  }, [s]);

  const resendVerification = async () => {
    if (!s?.email) return;
    setResending(true);
    try {
      const redirectOrigin = getAuthRedirectOrigin();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: s.email,
        options: { emailRedirectTo: `${redirectOrigin}/checkout/success${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}` },
      });
      if (error) throw error;
      toast.success("Verification email sent — check your inbox");
    } catch (e) {
      toast.error((e as Error).message ?? "Could not resend email");
    } finally {
      setResending(false);
    }
  };

  // Signed-out visitor landing here from Stripe (e.g. paid as guest / session
  // expired): send them to sign-in so we can identify them and restore state.
  if (signedIn === false) {
    const email = summary?.email ?? "";
    const redirectPath = `/checkout/success${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`;
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)" }}
      >
        <Card className="max-w-md w-full shadow-xl relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500" />
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center animate-scale-in">
              <PartyPopper className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Payment received!</h1>
            <p className="text-sm text-slate-600">
              Create your password with the same email you used at checkout. Then your account and technician order will unlock automatically.
            </p>
            {summary?.planName && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-left text-xs text-emerald-900">
                <b>{summary.planName}</b>{summary.hardwareQuantity ? ` · ${summary.hardwareQuantity} sensor(s)` : ""}
                {email ? <div className="mt-1 text-emerald-700">{email}</div> : null}
              </div>
            )}
            <Button asChild className="w-full bg-[#00a63e] hover:bg-[#029238] text-white">
              <Link to="/auth/signup" search={{ email: email || undefined, redirect: redirectPath } as never}>
                Create password & activate <UserPlus className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth/login" search={{ prefill: email || undefined, redirect: redirectPath } as never}>
                I already have an account <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-10 px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)" }}
    >
      <Confetti />
      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Hero */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="mx-auto h-20 w-20 rounded-full bg-white shadow-xl flex items-center justify-center animate-scale-in">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 flex items-center justify-center gap-2">
            Welcome to GrainHero <Sparkles className="h-6 w-6 text-amber-500" />
          </h1>
          <p className="text-slate-600 max-w-md mx-auto">
            Your payment is confirmed. Follow the path below and GrainHero will be ready for you fast.
          </p>
          {planLabel && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white capitalize">{planLabel} plan</Badge>
          )}
        </div>

        {/* Steps */}
        <Card className="shadow-lg border-slate-200">
          <CardContent className="p-6 divide-y divide-slate-100">
            <StepRow
              done={paymentDone}
              icon={<Loader2 className="h-4 w-4 animate-spin" />}
              title={paymentDone ? "Payment confirmed" : "Activating your subscription…"}
              desc={
                paymentDone
                  ? "Stripe has settled your payment and your plan is live."
                  : "This usually takes a few seconds. You can leave this page open."
              }
            />
            <StepRow
              done={Boolean(s?.profile)}
              icon={<UserPlus className="h-4 w-4" />}
              title="Account connected"
              desc={claiming ? "Linking your paid order to this account…" : "Your checkout email is connected to your GrainHero login."}
            />
            <StepRow
              done={emailDone}
              icon={<Mail className="h-4 w-4" />}
              title={emailDone ? "Email verified" : "Verify your email"}
              desc={
                emailDone
                  ? `${s?.email ?? "Your email"} is confirmed.`
                  : `Click the link we sent to ${s?.email ?? "your inbox"} to secure your account.`
              }
              action={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resending}
                  onClick={resendVerification}
                >
                  {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Resend email"}
                </Button>
              }
            />
            <StepRow
              done={false}
              icon={<CalendarCheck className="h-4 w-4" />}
              title="Technician install scheduled"
              desc={
                (s?.latestOrder as { technician_name?: string } | null)?.technician_name
                  ? `Assigned to ${(s?.latestOrder as { technician_name?: string })?.technician_name}. We'll email you the visit time.`
                  : "Our team will contact you within 24 hours to schedule the sensor install."
              }
            />
            <StepRow
              done={false}
              icon={<Truck className="h-4 w-4" />}
              title="On-site setup by GrainHero"
              desc="Our technician installs IoT sensors, checks your storage setup, and turns monitoring live."
            />
            <StepRow
              done={false}
              icon={<ShieldCheck className="h-4 w-4" />}
              title="First dashboard walkthrough"
              desc="A quick in-app guide will point out plans, orders, notifications, silos, sensors, and settings."
              action={
                <Button
                  size="sm"
                  className="bg-[#00a63e] hover:bg-[#029238] text-white"
                  onClick={() => navigate({ to: "/dashboard" })}
                >
                  Go to dashboard <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              }
            />
          </CardContent>
        </Card>

        {allDone && (
          <div className="text-center animate-fade-in">
            <Button
              size="lg"
              className="bg-[#00a63e] hover:bg-[#029238] text-white"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              Enter your dashboard <ArrowRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-slate-500">
          Need help? Email us at <a href="mailto:support@grainhero.app" className="underline">support@grainhero.app</a>
        </p>
      </div>
    </div>
  );
}