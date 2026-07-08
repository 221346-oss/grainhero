import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, DollarSign, Server, Activity, Globe2 } from "lucide-react";
import { PageHeader, StatCard, Placeholder } from "./_shared";
import { useDashboardStats } from "./useDashboardStats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { sendAdminTestEmail } from "@/lib/admin-test-email.functions";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { useMyProfile } from "@/hooks/useMyProfile";

export function SuperAdminDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();
  const profile = useMyProfile();
  const fn = useServerFn(sendAdminTestEmail);
  const [to, setTo] = useState<string>("");
  const initial = to || profile.data?.email || "";
  const mut = useMutation({
    mutationFn: (email: string) => fn({ data: { to: email } }),
    onSuccess: (r) => toast.success(`Test email sent to ${r.to}`),
    onError: (e: Error) => toast.error(e.message || "Failed to send"),
  });
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`Super Admin${name ? ` — ${name}` : ""}`}
        subtitle="Platform-wide health, tenants, subscriptions and revenue"
        badge="Super Admin"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Warehouses" value={s?.warehouses ?? "—"} icon={Building2} accent="emerald" />
        <StatCard label="Silos" value={s?.silos ?? "—"} icon={Users} accent="sky" />
        <StatCard label="Batches" value={s?.batches.total ?? "—"} icon={DollarSign} accent="violet" />
        <StatCard label="Sensors" value={s?.sensors.total ?? "—"} icon={Server} accent="amber" />
        <StatCard label="Actuators" value={s?.actuators.total ?? "—"} icon={Activity} accent="emerald" />
        <StatCard label="Alerts" value={s?.alerts.open ?? "—"} icon={Globe2} accent="rose" />
      </div>
      <Card className="mb-6 border-emerald-200/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-emerald-600" /> Send test email (Resend)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="you@example.com"
              value={initial}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => {
                const email = (to || profile.data?.email || "").trim();
                if (!email) return toast.error("Enter an email");
                mut.mutate(email);
              }}
              disabled={mut.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send test"}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Sends a plain test email via the Resend connector using RESEND_FROM_EMAIL.
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base">Recent Signups</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base">System Alerts</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
        <Card className="md:col-span-2 border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base">Global Analytics</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
      </div>
    </div>
  );
}