import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ReportsSection } from "@/components/administration/ReportsSection";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Grain Hero" },
      { name: "description", content: "Reports workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Reports — Grain Hero" },
      { property: "og:description", content: "Reports workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <ReportsSection />
    </div>
  );
}
