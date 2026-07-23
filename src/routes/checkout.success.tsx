import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Loader2, CheckCircle2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getCheckoutSessionSummary, claimPaidCheckoutForUser } from "@/lib/stripe-checkout.functions";
import { sendCheckoutConfirmationEmail } from "@/lib/checkout-emails.functions";
import { autoConfirmUserEmail } from "@/lib/auth-verification-email.functions";

const search = z.object({
  session_id: z.string().optional(),
});

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Welcome to GrainHero 🎉" },
      { name: "description", content: "Your payment is confirmed. Setting up your account…" },
    ],
  }),
  component: SuccessPage,
});

const DRAFT_KEY = "grainhero.checkoutDraft.v1";
const PENDING_SESSION_KEY = "grainhero.pendingCheckoutSession";

function readDraft() {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(DRAFT_KEY) : null;
    if (!raw) return { customerEmail: "", customerName: "", customerPassword: "" };
    const d = JSON.parse(raw) as Record<string, string>;
    return {
      customerEmail: d.customerEmail ?? "",
      customerName: d.customerName ?? "",
      customerPassword: d.customerPassword ?? "",
    };
  } catch {
    return { customerEmail: "", customerName: "", customerPassword: "" };
  }
}

type Status = "loading" | "creating_account" | "done" | "error";

function SuccessPage() {
  const navigate = useNavigate();
  const { session_id: sessionId } = Route.useSearch();
  const summaryFn = useServerFn(getCheckoutSessionSummary);
  const confirmFn = useServerFn(autoConfirmUserEmail);
  const claimFn = useServerFn(claimPaidCheckoutForUser);
  const sendConfirmFn = useServerFn(sendCheckoutConfirmationEmail);

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const ran = useRef(false);
  const confirmEmailSent = useRef(false);

  // Send buyer confirmation email — idempotent, best-effort
  useEffect(() => {
    if (!sessionId || confirmEmailSent.current) return;
    confirmEmailSent.current = true;
    sendConfirmFn({ data: { sessionId } }).catch((e) =>
      console.warn("[confirm email]", (e as Error).message),
    );
  }, [sendConfirmFn, sessionId]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (sessionId) {
        try { window.localStorage.setItem(PENDING_SESSION_KEY, sessionId); } catch { /* ignore */ }
      }

      const draft = readDraft();
      let email = draft.customerEmail;
      const password = draft.customerPassword;
      const name = draft.customerName;

      // Get email from Stripe session if draft is empty
      if (!email && sessionId) {
        try {
          const s = await summaryFn({ data: { sessionId } });
          email = s?.email ?? "";
        } catch { /* ignore */ }
      }

      if (!email) {
        navigate({ to: "/auth/login", replace: true });
        return;
      }

      if (!password) {
        // Payment succeeded but password wasn't saved — finish signup manually.
        try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        navigate({
          to: "/auth/signup",
          search: {
            email,
            redirect: sessionId ? `/checkout/success?session_id=${sessionId}` : undefined,
          } as never,
          replace: true,
        });
        return;
      }

      // Create account, link the paid order, and sign in.
      setStatus("creating_account");

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, business_type: "farm" } },
      });

      const alreadyRegistered = signUpError?.message.toLowerCase().includes("already registered");

      if (signUpError && !alreadyRegistered) {
        setStatus("error");
        setErrorMsg(signUpError.message);
        return;
      }

      try {
        await confirmFn({ data: { email } });
      } catch (e) {
        console.warn("[success] auto-confirm failed:", (e as Error).message);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setStatus("error");
        setErrorMsg(`Payment received but sign-in failed: ${signInError.message}. Try logging in with your email.`);
        return;
      }

      try {
        await claimFn({ data: sessionId ? { sessionId } : {} });
      } catch (e) {
        console.warn("[success] claim checkout failed:", (e as Error).message);
      }

      try {
        window.localStorage.removeItem(DRAFT_KEY);
        window.localStorage.removeItem(PENDING_SESSION_KEY);
      } catch { /* ignore */ }

      setStatus("done");

      setTimeout(() => {
        navigate({ to: "/dashboard", replace: true });
      }, 800);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const statusMessages: Record<Status, string> = {
    loading: "Confirming your payment…",
    creating_account: "Setting up your account…",
    done: "Account ready! Taking you to your dashboard…",
    error: errorMsg || "Something went wrong.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background checkout-inline-bg transition-colors">
      <Card className="max-w-sm w-full shadow-xl">
        <CardContent className="p-8 text-center space-y-4">
          {status === "error" ? (
            <>
              <div className="mx-auto h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
                <PartyPopper className="h-7 w-7 text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
              <p className="text-sm text-slate-600">{errorMsg}</p>
              <Button
                className="w-full bg-[#00a63e] hover:bg-[#029238] text-white"
                onClick={() => navigate({ to: "/auth/login" })}
              >
                Go to login
              </Button>
            </>
          ) : status === "done" ? (
            <>
              <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Payment confirmed!</h1>
              <p className="text-sm text-slate-600">Taking you to your dashboard…</p>
            </>
          ) : (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto" />
              <p className="text-sm font-medium text-slate-700">{statusMessages[status]}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
