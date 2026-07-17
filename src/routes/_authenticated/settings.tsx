import { DashboardSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Save, User, Bell, MapPin, Loader2, Palette, Check, Camera, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboards/_shared";
import { getMySettings, updateMySettings } from "@/lib/team-settings-insurance.functions";
import { THEMES, applyTheme, getStoredTheme, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/hooks/useMyProfile";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

type Prefs = { email_alerts?: boolean; sms_alerts?: boolean; push_notifications?: boolean; weekly_reports?: boolean; expiry_email_alerts?: boolean; expiry_push_alerts?: boolean };

function DefaultAvatar({ initials }: { initials: string }) {
  return (
    <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="url(#avatar-grad)" />
      <defs>
        <linearGradient id="avatar-grad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00a63e" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <text
        x="40" y="40"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="28"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        fill="white"
      >
        {initials}
      </text>
    </svg>
  );
}

function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMySettings);
  const saveFn = useServerFn(updateMySettings);

  const { data, isLoading } = useQuery({ queryKey: ["my-settings"], queryFn: () => getFn() });

  // Get auth email — profile.email may be empty for some users
  const [authEmail, setAuthEmail] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data: u }) => {
      if (u?.user?.email) setAuthEmail(u.user.email);
    });
  }, []);
  const [theme, setTheme] = useState<ThemeId>(() => getStoredTheme());
  function selectTheme(id: ThemeId) { setTheme(id); applyTheme(id); }

  const [form, setForm] = useState({
    name: "", phone: "", avatar: null as string | null,
    address: "", city: "", country: "",
    prefs: { email_alerts: true, sms_alerts: false, push_notifications: true, weekly_reports: true, expiry_email_alerts: true, expiry_push_alerts: true } as Prefs,
  });
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!data) return;
    const addr = (data.address ?? {}) as any;
    const prefs = (data.preferences ?? {}) as any;
    setForm({
      name: data.name ?? "", phone: data.phone ?? "",
      avatar: (data as any).avatar ?? null,
      address: addr.address ?? "", city: addr.city ?? "", country: addr.country ?? "",
      prefs: { email_alerts: prefs.email_alerts ?? true, sms_alerts: prefs.sms_alerts ?? false, push_notifications: prefs.push_notifications ?? true, weekly_reports: prefs.weekly_reports ?? true, expiry_email_alerts: prefs.expiry_email_alerts ?? true, expiry_push_alerts: prefs.expiry_push_alerts ?? true },
    });
    // Also use profile email as fallback if auth email not loaded yet
    if (!authEmail && data.email) setAuthEmail(data.email);
  }, [data, authEmail]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      name: form.name, phone: form.phone, avatar: form.avatar,
      address: { address: form.address, city: form.city, country: form.country },
      preferences: form.prefs as Record<string, unknown>,
    } }),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["my-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    const resized = await new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const s = Math.min(img.width, img.height);
        const sx = (img.width - s) / 2, sy = (img.height - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
    setForm((f) => ({ ...f, avatar: resized }));
  }

  const initials = initialsOf(form.name, authEmail || data?.email || "");

  if (isLoading) return <DashboardSkeleton />;

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
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-border shadow-sm group flex-shrink-0"
                  aria-label="Change profile picture"
                >
                  {form.avatar ? (
                    <img src={form.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <DefaultAvatar initials={initials} />
                  )}
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center text-white rounded-full">
                    <Camera className="h-5 w-5" />
                  </span>
                </button>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Profile picture</div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      <Camera className="h-4 w-4 mr-2" /> {form.avatar ? "Change" : "Upload"}
                    </Button>
                    {form.avatar && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, avatar: null })}>
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Square image works best. Save to apply.</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.currentTarget.value = ""; }}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></div>
                <div>
                  <Label>Email</Label>
                  <Input value={authEmail || data?.email || ""} disabled className="bg-muted/50 cursor-not-allowed" />
                </div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 0000000" /></div>
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
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>App tour</CardTitle>
              <CardDescription>Replay the guided walkthrough of the dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <button
                type="button"
                onClick={() => {
                  import("@/components/app/OnboardingTour").then((m) => m.restartOnboardingTour());
                }}
                className="inline-flex items-center gap-2 rounded-md bg-[#00a63e] hover:bg-[#029238] text-white px-4 py-2 text-sm font-medium"
              >
                Replay the tour
              </button>
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
                { key: "expiry_email_alerts", label: "Email me when my plan is about to expire (7 / 3 / 1 days)" },
                { key: "expiry_push_alerts", label: "In-app notification when my plan is about to expire" },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
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