import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/not-allowed")({
  component: NotAllowedPage,
});

function NotAllowedPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          Access denied
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your role doesn't have permission to view that page or section.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}