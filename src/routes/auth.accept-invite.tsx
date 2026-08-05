import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, Message, type Msg } from "@/components/auth/AuthShell";

const search = z.object({
  email: z.string().email().optional(),
});

export const Route = createFileRoute("/auth/accept-invite")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [{ title: "Accept your invitation — GrainHero" }],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const navigate = useNavigate();
  const { email: prefillEmail } = Route.useSearch();

  const [form, setForm] = useState({
    email: prefillEmail ?? "",
    code: "",
    name: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const email = form.email.trim().toLowerCase();
    const code = form.code.trim().toUpperCase();

    if (!email || !code || !form.name.trim()) {
      setMsg({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/v1/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message ?? "Invalid or expired invitation code.");
      }

      setMsg({ type: "success", text: "Account activated! Redirecting to sign in…" });
      setTimeout(() => navigate({ to: "/auth/login", search: { prefill: email } as never }), 1200);
    } catch (err) {
      setMsg({
        type: "error",
        text: (err as Error).message || "Something went wrong. Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Accept your invitation</h1>
          <p className="text-sm text-muted-foreground">
            Enter the code from your invite email to activate your account
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-email">Email</Label>
            <Input
              id="ai-email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-code">Invitation code</Label>
            <Input
              id="ai-code"
              value={form.code}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
              placeholder="ABCD2345"
              required
              className="tracking-widest font-mono uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-name">Full name</Label>
            <Input
              id="ai-name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-phone">Phone (optional)</Label>
            <Input
              id="ai-phone"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>

          <Message msg={msg} />

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00a63e] hover:bg-[#029238] text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activate my account"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          No password needed — you'll sign in with a one-time email code next.
        </p>
        <p className="text-sm text-center text-muted-foreground">
          <Link to="/auth/login" className="text-[#00a63e] font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
