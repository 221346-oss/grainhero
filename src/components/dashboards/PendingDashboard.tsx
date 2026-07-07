import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export function PendingDashboard({ name }: { name?: string }) {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Card className="border-amber-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <CardTitle>Welcome{name ? `, ${name}` : ""}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-slate-600 space-y-2">
          <p>Your account is created but no role has been assigned yet.</p>
          <p className="text-sm">Ask your administrator to grant you a role, or contact GrainHero support.</p>
        </CardContent>
      </Card>
    </div>
  );
}