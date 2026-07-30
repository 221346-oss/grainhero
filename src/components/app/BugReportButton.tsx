import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bug, Wrench, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { submitBugReport } from "@/lib/bug-reports.functions";

type Category = "bug" | "maintenance";

export function BugReportButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const submitFn = useServerFn(submitBugReport);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("bug");

  const mutation = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          description: description.trim(),
          category,
          pagePath: pathname,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
      }),
    onSuccess: () => {
      toast.success(category === "maintenance" ? "Thanks — your maintenance note was submitted." : "Thanks — your bug report was submitted.");
      setDescription("");
      setCategory("bug");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Could not submit report"),
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

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setDescription(""); setCategory("bug"); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>
              Describe what's wrong. We'll capture the page you're on automatically.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3 py-1"
            onSubmit={(e) => { e.preventDefault(); if (description.trim().length >= 5) mutation.mutate(); }}
          >
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug"><span className="inline-flex items-center gap-1.5"><Bug className="h-3.5 w-3.5" /> Bug / app issue</span></SelectItem>
                  <SelectItem value="maintenance"><span className="inline-flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" /> Maintenance note</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              autoFocus
              rows={5}
              placeholder={category === "maintenance" ? "What needs maintenance, and why?" : "What happened? What did you expect instead?"}
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
