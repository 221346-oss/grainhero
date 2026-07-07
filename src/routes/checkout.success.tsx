import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/checkout/success")({
  head: () => ({ meta: [{ title: "Payment successful — GrainHero" }] }),
  component: SuccessPage,
});

function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)" }}>
      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Payment received!</h1>
          <p className="text-sm text-slate-600">
            Your subscription is being activated. It may take up to a minute for your plan to appear on the dashboard.
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild className="bg-[#00a63e] hover:bg-[#029238] text-white">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/subscription">View subscription</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}