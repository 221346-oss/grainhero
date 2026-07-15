import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Mail, HelpCircle, ArrowRight, Shield, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PendingDashboard({ name }: { name?: string }) {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Main status card */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Welcome{name ? `, ${name}` : " to GrainHero"}! 👋</CardTitle>
              <CardDescription className="mt-1">Your account is in pending state</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-white p-4 border border-amber-200">
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" />
              What does this mean?
            </h3>
            <p className="text-sm text-slate-600">
              Your account has been created successfully, but you're waiting for role assignment. 
              A <strong>Super Admin</strong> needs to assign you a role (Admin, Manager, or Technician) before you can access the full dashboard.
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Next steps
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">1.</span>
                <span>Contact your organization's <strong>Super Admin</strong> or system administrator</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">2.</span>
                <span>Ask them to assign you a role based on your responsibilities</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">3.</span>
                <span>Once assigned, refresh this page to access your dashboard</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Refresh page
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-slate-200"
            >
              <a href="mailto:support@grainhero.app">
                <Mail className="w-4 h-4 mr-2" />
                Contact support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-600" />
              Need help?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-3">
            <p>
              If you're unsure who your administrator is, or if it's been more than 24 hours:
            </p>
            <Button variant="link" className="h-auto p-0 text-emerald-600" asChild>
              <a href="mailto:support@grainhero.app">Email GrainHero Support →</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-600" />
              Role types
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <div><strong className="text-slate-900">Admin:</strong> Full warehouse/silo management</div>
            <div><strong className="text-slate-900">Manager:</strong> Operations & monitoring</div>
            <div><strong className="text-slate-900">Technician:</strong> Sensor maintenance</div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <p className="text-xs text-slate-500">
          Account created but can't access features? This is normal — role assignment is required for security.
        </p>
      </div>
    </div>
  );
}