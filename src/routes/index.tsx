import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";
import { useState } from "react";

import { joinWaitlist } from "@/lib/waitlist.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

type Status =
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function Index() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [isPending, setIsPending] = useState(false);

  const submitWaitlist = useServerFn(joinWaitlist);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsPending(true);

    try {
      const result = await submitWaitlist({ data: { email } });
      setStatus({ type: "success", message: result.message });
      setEmail("");
    } catch {
      setStatus({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, oklch(0.968 0.007 247.896 / 0.6) 0%, transparent 40%), radial-gradient(circle at 20% 80%, oklch(0.929 0.013 255.508 / 0.4) 0%, transparent 40%)",
        }}
      />

      <main className="w-full max-w-md text-center">
        <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Mail className="h-7 w-7" />
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Coming Soon
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          Something special is on the way. Join the waitlist and be the first to
          know when we launch.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-foreground shadow-sm outline-none ring-ring transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
          />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-70"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Notify me
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {status && (
          <div
            className={cn(
              "mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm",
              status.type === "success"
                ? "bg-secondary text-secondary-foreground"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {status.type === "success" && <Check className="h-4 w-4" />}
            {status.message}
          </div>
        )}
      </main>

      <footer className="absolute bottom-6 text-sm text-muted-foreground">
        © {new Date().getFullYear()}. All rights reserved.
      </footer>
    </div>
  );
}
