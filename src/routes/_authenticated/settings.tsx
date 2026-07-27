import { SettingsSkeleton, FormSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Save, Loader2, Check, Camera, Trash2, Plus, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { getMySettings, updateMySettings } from "@/lib/team-settings-insurance.functions";
import { LocationMap } from "@/components/app/LocationMap";
import { VariableFontText } from "@/components/app/VariableFontText";
import { THEMES, applyTheme, getStoredTheme, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { getPlatformSettings, updatePlatformSettings, type PlatformConfig } from "@/lib/platform-settings.functions";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

type Prefs = { email_alerts?: boolean; sms_alerts?: boolean; push_notifications?: boolean; weekly_reports?: boolean; expiry_email_alerts?: boolean; expiry_push_alerts?: boolean };

function DefaultAvatar() {
  return (
    <img
      src="/avatars/default-avatar.svg"
      alt=""
      className="absolute inset-0 h-full w-full object-cover bg-muted"
    />
  );
}

function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMySettings);
  const saveFn = useServerFn(updateMySettings);
  const isSuperAdmin = useIsSuperAdmin();

  const { data, isLoading } = useQuery({ queryKey: ["my-settings"], queryFn: () => getFn() });

  // Get auth email — profile.email may be empty for some users
  const [authEmail, setAuthEmail] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data: u }) => {
      if (u?.user?.email) setAuthEmail(u.user.email);
    });
  }, []);
  const [tab, setTab] = useState("profile");
  const [theme, setTheme] = useState<ThemeId>(() => getStoredTheme());
  function selectTheme(id: ThemeId) { setTheme(id); applyTheme(id); }

  const [form, setForm] = useState({
    name: "", phone: "", avatar: null as string | null,
    address: "", city: "", country: "",
    prefs: { email_alerts: true, sms_alerts: false, push_notifications: true, weekly_reports: true, expiry_email_alerts: true, expiry_push_alerts: true } as Prefs,
  });
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Serialized snapshot of what the server currently holds. Autosave compares
  // against this so refetches and re-renders don't trigger redundant writes.
  const lastSavedRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const serialize = (f: typeof form) => JSON.stringify({
    name: f.name, phone: f.phone, avatar: f.avatar,
    address: { address: f.address, city: f.city, country: f.country },
    preferences: f.prefs as Record<string, unknown>,
  });

  useEffect(() => {
    if (!data || hydratedRef.current) return;
    const addr = (data.address ?? {}) as any;
    const prefs = (data.preferences ?? {}) as any;
    const next = {
      name: data.name ?? "", phone: data.phone ?? "",
      avatar: (data as any).avatar ?? null,
      address: addr.address ?? "", city: addr.city ?? "", country: addr.country ?? "",
      prefs: { email_alerts: prefs.email_alerts ?? true, sms_alerts: prefs.sms_alerts ?? false, push_notifications: prefs.push_notifications ?? true, weekly_reports: prefs.weekly_reports ?? true, expiry_email_alerts: prefs.expiry_email_alerts ?? true, expiry_push_alerts: prefs.expiry_push_alerts ?? true },
    };
    hydratedRef.current = true;
    lastSavedRef.current = serialize(next);
    setForm(next);
    // Also use profile email as fallback if auth email not loaded yet
    if (!authEmail && data.email) setAuthEmail(data.email);
  }, [data, authEmail]);

  const save = useMutation({
    mutationFn: (snapshot: string) => saveFn({ data: JSON.parse(snapshot) }),
    onSuccess: (_res, snapshot) => {
      lastSavedRef.current = snapshot;
      qc.invalidateQueries({ queryKey: ["my-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Autosave: debounce edits, then persist whatever differs from the server copy.
  useEffect(() => {
    if (lastSavedRef.current === null) return;
    const snapshot = serialize(form);
    if (snapshot === lastSavedRef.current) return;
    const t = setTimeout(() => save.mutate(snapshot), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

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

  if (isLoading) return <SettingsSkeleton />;

  return (
    <AdminPageShell
      title="Settings"
      subtitle="Manage your profile, location and appearance"
      actions={
        save.isPending ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </span>
        ) : null
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        {/* Variable-font hover nav — letters bolden outward from the center */}
        <div className="mb-6 overflow-x-auto no-scrollbar border-b border-border">
          <div className="flex items-center gap-8 px-1">
            {([
              { value: "profile", label: "Profile" },
              { value: "location", label: "Location" },
              { value: "appearance", label: "Appearance" },
              ...(isSuperAdmin ? [{ value: "platform", label: "Platform" }] : []),
            ] as { value: string; label: string }[]).map((t) => {
              const isActive = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  className={cn(
                    "relative py-3 text-sm uppercase tracking-[0.15em] whitespace-nowrap transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <VariableFontText text={t.label} base={isActive ? 850 : 350} hover={850} staggerMs={30} />
                  {isActive && (
                    <motion.div
                      layoutId="settings-tab-underline"
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#2FAC0C]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <TabsContent value="profile">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.currentTarget.value = ""; }}
          />

          <div className="w-full max-w-5xl mx-auto">
            {/* Desktop: avatar left, profile card overlapping on the right */}
            <div className="hidden md:flex relative items-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Change profile picture"
                className="relative w-[470px] h-[470px] rounded-3xl overflow-hidden flex-shrink-0 group"
              >
                {form.avatar ? (
                  <img src={form.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <DefaultAvatar />
                )}
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center text-white">
                  <Camera className="h-8 w-8" />
                </span>
              </button>

              <div className="bg-white dark:bg-card rounded-2xl shadow-xl p-4 ml-[-80px] z-10 w-[340px] flex-shrink-0">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-foreground">Profile</h2>
                  <p className="text-xs text-muted-foreground">Basic information about you.</p>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="text-xs font-medium text-foreground">Profile picture</div>
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
                  <p className="text-xs text-muted-foreground">Square image works best.</p>
                </div>

                <div className="space-y-2.5">
                  <div><Label className="text-xs">Full name</Label><Input className="h-9" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={authEmail || data?.email || ""} disabled className="h-9 bg-muted/50 cursor-not-allowed" />
                  </div>
                  <div><Label className="text-xs">Phone</Label><Input className="h-9" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 0000000" /></div>
                </div>
              </div>
            </div>

            {/* Mobile: avatar stacked above the profile card */}
            <div className="md:hidden max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Change profile picture"
                className="relative w-40 h-40 mx-auto rounded-2xl overflow-hidden mb-4 group"
              >
                {form.avatar ? (
                  <img src={form.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <DefaultAvatar />
                )}
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center text-white">
                  <Camera className="h-6 w-6" />
                </span>
              </button>

              <div className="bg-white dark:bg-card rounded-2xl shadow-xl p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-foreground">Profile</h2>
                  <p className="text-xs text-muted-foreground">Basic information about you.</p>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="text-xs font-medium text-foreground">Profile picture</div>
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
                  <p className="text-xs text-muted-foreground">Square image works best.</p>
                </div>

                <div className="space-y-2.5">
                  <div><Label className="text-xs">Full name</Label><Input className="h-9" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={authEmail || data?.email || ""} disabled className="h-9 bg-muted/50 cursor-not-allowed" />
                  </div>
                  <div><Label className="text-xs">Phone</Label><Input className="h-9" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 0000000" /></div>
                </div>
              </div>
            </div>
          </div>
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
          <div className="mt-4">
            <LocationMap address={form.address} city={form.city} country={form.country} />
          </div>
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

        {isSuperAdmin && (
          <TabsContent value="platform">
            <PlatformSettingsSection />
          </TabsContent>
        )}
      </Tabs>
    </AdminPageShell>
  );
}

function PlatformSettingsSection() {
  const qc = useQueryClient();
  const getFn = useServerFn(getPlatformSettings);
  const saveFn = useServerFn(updatePlatformSettings);
  const { data, isLoading } = useQuery({ queryKey: ["platform-settings"], queryFn: () => getFn() });
  const [cfg, setCfg] = useState<PlatformConfig | null>(null);
  useEffect(() => { if (data) setCfg(data); }, [data]);
  const [flagKey, setFlagKey] = useState("");
  const [thresholdKey, setThresholdKey] = useState("");
  const [thresholdVal, setThresholdVal] = useState("");

  const save = useMutation({
    mutationFn: () => saveFn({ data: cfg! }),
    onSuccess: () => { toast.success("Platform settings saved"); qc.invalidateQueries({ queryKey: ["platform-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !cfg) return <FormSkeleton fields={4} />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Maintenance mode</CardTitle>
          <CardDescription>When on, tenant apps can display a maintenance notice. Reads platform_settings.config.maintenance_mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <span className="text-sm font-medium text-slate-700">Enable maintenance mode</span>
            <Switch checked={cfg.maintenance_mode} onCheckedChange={(v) => setCfg({ ...cfg, maintenance_mode: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
          <CardDescription>Boolean flags any part of the app can read. Toggle to enable or disable a feature platform-wide.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(cfg.feature_flags).length === 0 && (
            <p className="text-sm text-muted-foreground">No feature flags yet.</p>
          )}
          {Object.entries(cfg.feature_flags).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <code className="text-sm font-mono">{k}</code>
              <div className="flex items-center gap-2">
                <Switch checked={v} onCheckedChange={(next) => setCfg({ ...cfg, feature_flags: { ...cfg.feature_flags, [k]: next } })} />
                <Button size="icon" variant="ghost" onClick={() => {
                  const { [k]: _drop, ...rest } = cfg.feature_flags;
                  setCfg({ ...cfg, feature_flags: rest });
                }}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input placeholder="new_flag_key" value={flagKey} onChange={(e) => setFlagKey(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => {
              const k = flagKey.trim();
              if (!k) return;
              setCfg({ ...cfg, feature_flags: { ...cfg.feature_flags, [k]: false } });
              setFlagKey("");
            }}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default thresholds</CardTitle>
          <CardDescription>Baseline numeric thresholds (e.g. spoilage_risk, humidity_alert). Tenants can override in their own settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(cfg.default_thresholds).length === 0 && (
            <p className="text-sm text-muted-foreground">No default thresholds yet.</p>
          )}
          {Object.entries(cfg.default_thresholds).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
              <code className="text-sm font-mono flex-1 truncate">{k}</code>
              <Input
                type="number"
                value={v}
                onChange={(e) => setCfg({ ...cfg, default_thresholds: { ...cfg.default_thresholds, [k]: Number(e.target.value) } })}
                className="w-32"
              />
              <Button size="icon" variant="ghost" onClick={() => {
                const { [k]: _drop, ...rest } = cfg.default_thresholds;
                setCfg({ ...cfg, default_thresholds: rest });
              }}><X className="h-4 w-4" /></Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input placeholder="threshold_key" value={thresholdKey} onChange={(e) => setThresholdKey(e.target.value)} />
            <Input placeholder="value" type="number" value={thresholdVal} onChange={(e) => setThresholdVal(e.target.value)} className="w-32" />
            <Button type="button" variant="outline" onClick={() => {
              const k = thresholdKey.trim();
              const n = Number(thresholdVal);
              if (!k || Number.isNaN(n)) return;
              setCfg({ ...cfg, default_thresholds: { ...cfg.default_thresholds, [k]: n } });
              setThresholdKey(""); setThresholdVal("");
            }}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-emerald-600 hover:bg-emerald-700">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save platform settings
        </Button>
      </div>
    </div>
  );
}