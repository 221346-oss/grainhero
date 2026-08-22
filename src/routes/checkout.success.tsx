import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Loader2, CheckCircle2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isAuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getCheckoutSessionSummary, claimPaidCheckoutForUser } from "@/lib/stripe-checkout.functions";
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
      { property: 'og:title', content: "Welcome to GrainHero 🎉" },
      { property: 'og:description', content: "Your payment is confirmed. Setting up your account…" },
      { property: 'og:url', content: 'https://grainhero.app/checkout/success' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: [{ rel: 'canonical', href: 'https://grainhero.app/checkout/success' }],
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

// Guards against ever showing a raw "{}" or "[object Object]" — anything
// thrown that isn't a proper Error (a rejected fetch, a bare object, etc.)
// falls back to a message that at least tells the user what to do next.
function describeError(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return "Payment succeeded but we couldn't finish setting up your account. Please try logging in, or contact support if this keeps happening.";
}

// Detects "this email is already registered" from a supabase.auth.signUp()
// error. There are two shapes this actually takes:
//  1. The clean path — GoTrue returns 422 with error_code "user_already_exists".
//     supabase-js surfaces this as AuthApiError with .code === "user_already_exists".
//  2. The path this app actually hits — GoTrue's insert for a duplicate email
//     fails server-side with a 5xx instead. supabase-js's fetch handler treats
//     EVERY 5xx as a generic "retryable" infra error and deliberately never
//     parses the response body for those (see NETWORK_ERROR_CODES in
//     @supabase/auth-js/lib/fetch.js) — so the real error_code/message is
//     thrown away. The message it builds instead is JSON.stringify(rawResponse);
//     a fetch Response object has no enumerable own properties, so that
//     literally serializes to the string "{}" — which is the exact crash text
//     reported. AuthRetryableFetchError + a 5xx status during signUp is the
//     confirmed signature of a duplicate-email attempt in this environment.
function isDuplicateEmailSignUpError(e: unknown): boolean {
  if (isAuthApiError(e) && e.code === "user_already_exists") return true;
  if (e instanceof Error && /already registered|already exists/i.test(e.message)) return true;
  if (isAuthRetryableFetchError(e) && e.status >= 500 && e.status < 600) return true;
  return false;
}

function SuccessPage() {
  const navigate = useNavigate();
  const { session_id: sessionId } = Route.useSearch();
  const summaryFn = useServerFn(getCheckoutSessionSummary);
  const confirmFn = useServerFn(autoConfirmUserEmail);
  const claimFn = useServerFn(claimPaidCheckoutForUser);

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
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

        if (signUpError) {
          // Always log the real error for developers — only the user-facing
          // copy below is sanitized.
          console.error("[checkout/success] signUp failed:", signUpError);

          if (isDuplicateEmailSignUpError(signUpError)) {
            setStatus("error");
            setErrorMsg("An account with this email already exists. Please log in instead.");
            return;
          }

          setStatus("error");
          setErrorMsg("Something went wrong creating your account. Please contact support or try again.");
          return;
        }

        try {
          await confirmFn({ data: { email } });
        } catch (e) {
          console.warn("[success] auto-confirm failed:", describeError(e));
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setStatus("error");
          setErrorMsg(`Payment received but sign-in failed: ${describeError(signInError)}. Try logging in with your email.`);
          return;
        }

        // Only claim when we actually have the Stripe session this page was
        // reached for — an unconditional call here would re-notify admins
        // about every already-claimed order if sessionId is ever missing.
        if (sessionId) {
          try {
            await claimFn({ data: { sessionId } });
          } catch (e) {
            console.warn("[success] claim checkout failed:", describeError(e));
          }
        }

        try {
          window.localStorage.removeItem(DRAFT_KEY);
          window.localStorage.removeItem(PENDING_SESSION_KEY);
        } catch { /* ignore */ }

        setStatus("done");

        setTimeout(() => {
          navigate({ to: "/dashboard", replace: true });
        }, 800);
      } catch (e) {
        console.warn("[success] unexpected failure:", e);
        setStatus("error");
        setErrorMsg(describeError(e));
      }
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
              <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
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
              <h1 className="text-xl font-bold text-foreground">Payment confirmed!</h1>
              <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
            </>
          ) : (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto" />
              <p className="text-sm font-medium text-foreground">{statusMessages[status]}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
