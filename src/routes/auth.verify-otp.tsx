import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Message, type Msg } from "@/components/auth/AuthShell";
import { logSecurityEvent, logFailedSignIn } from "@/lib/security-events.functions";
import { claimPaidCheckoutForUser } from "@/lib/stripe-checkout.functions";

const PENDING_SESSION_KEY = "grainhero.pendingCheckoutSession";

const search = z.object({
  email: z.string().email().optional(),
});

export const Route = createFileRoute("/auth/verify-otp")({
  validateSearch: (s) => search.parse(s),
  beforeLoad: ({ search: s }) => {
    if (!s.email) throw redirect({ to: "/auth/login" });
  },
  head: () => ({
    meta: [
      { title: "Enter your code — GrainHero" },
      { name: "description", content: "Enter the verification code sent to your email to finish signing in." },
      { property: "og:title", content: "Enter your code — GrainHero" },
      { property: "og:description", content: "Enter the verification code sent to your email to finish signing in." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const claimFn = useServerFn(claimPaidCheckoutForUser);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  // Guards against double-submit when otp fills via more than one path at
  // once (typing the last digit + a paste/autofill event landing together).
  // A ref (not state) so the check is synchronous — a state flag wouldn't be
  // read back as true until the next render, letting both paths slip through.
  const autoSubmittedRef = useRef(false);

  // Fires on ANY otp-completing update — manual typing, paste, or OS/browser
  // one-time-code autofill. Autofill in particular often doesn't fill a
  // 6-separate-input OTP field the way manual typing does (it can miss the
  // per-keystroke handlers entirely), which is what "have to click a button
  // after the code appears" actually was — the code was filled, nothing
  // called verify(). Watching the otp state itself catches every path that
  // gets the boxes filled, not just the ones with an inline verify() call.
  useEffect(() => {
    if (!autoSubmittedRef.current && otp.every(Boolean)) {
      autoSubmittedRef.current = true;
      verify(otp.join(""));
    }
  }, [otp]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // Auto-redirect if already signed in or session is active within validity period
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        navigate({ to: "/dashboard", replace: true });
      }
    });

    // SIGNED_IN deliberately excluded here — verify() below already navigates
    // once its own sign-in flow (claim checkout, security-event log) finishes.
    // Reacting to SIGNED_IN here too meant two navigates racing for the same
    // destination right after OTP verification, one of them firing before
    // those side effects had a chance to run.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Do NOT navigate on any auth event - verify() handles all navigation
      // This prevents double navigation/verification prompts
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    verify(otp.join(""));
  };

  // Runs once the session is actually established (either verifyOtp
  // succeeded, or it errored but a session already existed — e.g. a
  // just-reused/expired token after an earlier attempt already signed in).
  // Only claims a pending Stripe checkout when a real session ID was
  // actually stashed by the checkout flow — claiming unconditionally here
  // is what caused "new order placed" emails to fire on every plain login.
  const finishSignIn = async () => {
    setMsg({ type: "success", text: "Verified! Taking you to dashboard…" });
    void logSecurityEvent({ data: { event: "sign_in_success", meta: { email } } }).catch(() => {});

    let pendingSessionId: string | null = null;
    try { pendingSessionId = window.localStorage.getItem(PENDING_SESSION_KEY); } catch { /* ignore */ }
    if (pendingSessionId) {
      try {
        await claimFn({ data: { sessionId: pendingSessionId } });
        window.localStorage.removeItem(PENDING_SESSION_KEY);
      } catch (e) {
        console.warn("[verify-otp] claim checkout failed:", (e as Error).message);
      }
    }

    navigate({ to: "/dashboard", replace: true });
  };

  const verify = async (token: string) => {
    if (loading) return;
    if (token.length < 6) {
      setMsg({ type: "error", text: "Enter the full 6-digit code." });
      return;
    }
    setMsg(null);
    setLoading(true);

    // Supabase signInWithOtp sends type "email" OTP
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    setLoading(false);

    if (error) {
      // Check if session was actually established despite error, or if token already used
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await finishSignIn();
        return;
      }

      const isExpiredOrInvalid = error.message.toLowerCase().includes("expired") || error.message.toLowerCase().includes("invalid");
      void logFailedSignIn({ data: { email, reason: error.message } }).catch(() => {});
      setMsg({
        type: "error",
        text: isExpiredOrInvalid
          ? "This code has expired or is invalid. Please click 'Resend code' to get a fresh code."
          : error.message,
      });
      // A failed attempt shouldn't permanently block a later successful
      // auto-submit (e.g. user fixes a mistyped digit and it completes again).
      autoSubmittedRef.current = false;
      return;
    }

    await finishSignIn();
  };

  const resend = async () => {
    setResending(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    setResending(false);

    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setOtp(["", "", "", "", "", ""]);
      autoSubmittedRef.current = false;
      inputRefs.current[0]?.focus();
      setMsg({ type: "success", text: "New code sent — check your inbox." });
    }
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-slate-900">{email}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            If you don't see the email, please check your spam or junk folder.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <Input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-12 text-center text-xl font-bold"
                autoFocus={i === 0}
              />
            ))}
          </div>

          <Message msg={msg} />

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00a63e] hover:bg-[#029238] text-white"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : "Verify & go to dashboard"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="text-sm text-[#00a63e] hover:underline inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {resending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <RefreshCw className="w-3 h-3" />}
            Resend code
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
