import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, User, Bell, MapPin, Loader2, Palette, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboards/_shared";
import { getMySettings, updateMySettings } from "@/lib/team-settings-insurance.functions";
import { THEMES, applyTheme, getStoredTheme, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

type Prefs = { email_alerts?: boolean; sms_alerts?: boolean; push_notifications?: boolean; weekly_reports?: boolean };

function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMySettings);
  const saveFn = useServerFn(updateMySettings);

  const { data, isLoading } = useQuery({ queryKey: ["my-settings"], queryFn: () => getFn() });
  const [theme, setTheme] = useState<ThemeId>(() => getStoredTheme());
  function selectTheme(id: ThemeId) { setTheme(id); applyTheme(id); }

  const [form, setForm] = useState({
    name: "", phone: "", business_type: "farm",
    address: "", city: "", country: "",
    prefs: { email_alerts: true, sms_alerts: false, push_notifications: true, weekly_reports: true } as Prefs,
  });

  useEffect(() => {
    if (!data) return;
    const addr = (data.address ?? {}) as any;
    const prefs = (data.preferences ?? {}) as any;
    setForm({
      name: data.name ?? "", phone: data.phone ?? "", business_type: data.business_type ?? "farm",
      address: addr.address ?? "", city: addr.city ?? "", country: addr.country ?? "",
      prefs: { email_alerts: prefs.email_alerts ?? true, sms_alerts: prefs.sms_alerts ?? false, push_notifications: prefs.push_notifications ?? true, weekly_reports: prefs.weekly_reports ?? true },
    });
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      name: form.name, phone: form.phone, business_type: form.business_type,
      address: { address: form.address, city: form.city, country: form.country },
      preferences: form.prefs as Record<string, unknown>,
    } }),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["my-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your profile, location and notification preferences" />

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" />Profile</TabsTrigger>
          <TabsTrigger value="location"><MapPin className="h-4 w-4 mr-2" />Location</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" />Notifications</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-2" />Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Basic information about you.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={data?.email ?? ""} disabled /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div>
                  <Label>Business Type</Label>
                  <Select value={form.business_type} onValueChange={(v) => setForm({ ...form, business_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farm">Farm</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="cooperative">Cooperative</SelectItem>
                      <SelectItem value="trader">Trader</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card>
            <CardHeader><CardTitle>Location</CardTitle><CardDescription>Where your operation is based.</CardDescription></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Notifications</CardTitle><CardDescription>Choose how we contact you.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "email_alerts", label: "Email alerts" },
                { key: "sms_alerts", label: "SMS alerts" },
                { key: "push_notifications", label: "Push notifications" },
                { key: "weekly_reports", label: "Weekly reports" },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <span className="text-sm font-medium text-slate-700">{row.label}</span>
                  <Switch
                    checked={!!form.prefs[row.key as keyof Prefs]}
                    onCheckedChange={(v) => setForm({ ...form, prefs: { ...form.prefs, [row.key]: v } })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Pick a color theme. Applies to the whole app instantly and is remembered on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {THEMES.map((t) => {
                  const active = t.id === theme;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectTheme(t.id)}
                      className={cn(
                        "group relative rounded-2xl border p-4 text-left transition-all",
                        active ? "border-[--fusion-grape] ring-2 ring-[--fusion-grape]/40" : "border-border hover:border-foreground/20",
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {t.swatch.map((c, i) => (
                          <span
                            key={i}
                            className="h-8 w-8 rounded-full ring-1 ring-black/10 shadow-sm"
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm text-foreground">{t.name}</div>
                        {active && (
                          <span className="h-6 w-6 rounded-full bg-[--fusion-grape] text-white grid place-items-center">
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-emerald-600 hover:bg-emerald-700">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}