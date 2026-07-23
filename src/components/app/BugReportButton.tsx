import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bug, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { submitBugReport } from "@/lib/bug-reports.functions";

export function BugReportButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const submitFn = useServerFn(submitBugReport);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          description: description.trim(),
          pagePath: pathname,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
      }),
    onSuccess: () => {
      toast.success("Thanks — your bug report was submitted.");
      setDescription("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Could not submit bug report"),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Report a bug"
        title="Report a bug"
        className="fixed bottom-5 right-5 z-40 h-11 w-11 rounded-full bg-card border border-border shadow-lg grid place-items-center text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/40 transition"
      >
        <Bug className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDescription(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report a bug</DialogTitle>
            <DialogDescription>
              Describe what went wrong. We'll capture the page you're on automatically.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3 py-1"
            onSubmit={(e) => { e.preventDefault(); if (description.trim().length >= 5) mutation.mutate(); }}
          >
            <Textarea
              autoFocus
              rows={5}
              placeholder="What happened? What did you expect instead?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={5}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending || description.trim().length < 5} className="gap-2">
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
                {mutation.isPending ? "Submitting…" : "Submit report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
