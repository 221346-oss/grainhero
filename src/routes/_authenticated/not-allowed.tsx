import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/not-allowed")({
  component: NotAllowedPage,
});

function NotAllowedPage() {
  return (
    <div className="p-8 max-w-lg mx-auto text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7 text-rose-600" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
      <p className="mt-2 text-slate-600">Your role doesn't have permission to view that page.</p>
      <Button asChild className="mt-6"><Link to="/dashboard">Back to dashboard</Link></Button>
    </div>
  );
}