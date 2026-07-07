"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Settings,
  Bell,
  Database,
  Globe,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Volume2,
  Vibrate,
  ShieldAlert
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { AnimatedBackground } from "@/components/animations/MotionGraphics"
import { getPushManager } from '@/lib/push-notifications'
import type { NotificationPreferences } from '@/lib/push-notifications'
import { toast } from 'sonner'
import { Suspense } from 'react'

interface CustomerSettings {
  name: string
  email: string
  phone: string
  business_type: string
  location: {
    address: string
    city: string
    country: string
  }
  notifications: {
    email_alerts: boolean
    sms_alerts: boolean
    push_notifications: boolean
    weekly_reports: boolean
    monthly_reports: boolean
    push_preferences?: NotificationPreferences
  }
  system: {
    auto_backup: boolean
    data_retention_days: number
    session_timeout_minutes: number
    two_factor_auth: boolean
  }
  integrations: {
    weather_api: boolean
    market_prices: boolean
    government_data: boolean
  }
}

// Main settings content component
function SettingsPageContent({ _locale }: { _locale: string }) {
  const router = useRouter();
  void router; // used for navigation if needed
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'general';
  const [settings, setSettings] = useState<CustomerSettings>({
    name: '',
    email: '',
    phone: '',
    business_type: 'farm',
    location: {
      address: '',
      city: '',
      country: ''
    },
    notifications: {
      email_alerts: true,
      sms_alerts: false,
      push_notifications: true,
      weekly_reports: true,
      monthly_reports: true
    },
    system: {
      auto_backup: true,
      data_retention_days: 365,
      session_timeout_minutes: 60,
      two_factor_auth: false
    },
    integrations: {
      weather_api: true,
      market_prices: true,
      government_data: false
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [initialTwoFactorState, setInitialTwoFactorState] = useState(false)
  
  // Push Notification States
  const [pushPreferences, setPushPreferences] = useState<NotificationPreferences | null>(null)
  const [hasPushSubscription, setHasPushSubscription] = useState(false)
  const [isTestingPush, setIsTestingPush] = useState(false)

  useEffect(() => {
    loadSettings()
    loadPushPreferences()
  }, [])

  const loadPushPreferences = async () => {
    try {
      const pushManager = getPushManager();
      // Check browser-side subscription
      const browserSubscribed = await pushManager.isAvailable();
      
      if (browserSubscribed) {
        // Also verify backend has it by fetching preferences
        const data = await pushManager.getPreferences();
        // If backend returns subscription_count > 0, we're truly paired
        const res = await api.get<{subscription_count: number; preferences: NotificationPreferences}>('/api/notifications/preferences');
        if (res.ok && res.data) {
          setHasPushSubscription(res.data.subscription_count > 0);
          setPushPreferences(res.data.preferences);
        } else {
          setHasPushSubscription(false);
          setPushPreferences(data.preferences);
        }
      } else {
        setHasPushSubscription(false);
        // Still fetch default preferences
        const data = await pushManager.getPreferences();
        setPushPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to load push preferences:', error);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true)
      // Fetch current user data from auth/profile
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || '/api'}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      let user = null;
      if (userResponse.ok) {
        user = await userResponse.json();
      }

      if (user) {
        // Define type for customer settings response
        interface CustomerSettingsResponse {
          business_type?: string;
          location?: {
            address?: string;
            city?: string;
            country?: string;
          };
          notifications?: {
            email_alerts: boolean;
            sms_alerts: boolean;
            push_notifications: boolean;
            weekly_reports: boolean;
            monthly_reports: boolean;
          };
          system?: {
            auto_backup: boolean;
            data_retention_days: number;
            session_timeout_minutes: number;
            two_factor_auth: boolean;
          };
          integrations?: {
            weather_api: boolean;
            market_prices: boolean;
            government_data: boolean;
          };
        }
        
        const customerRes = await api.get('/api/customer/settings').catch(() => null)
        const customerData: CustomerSettingsResponse | null = customerRes?.data || null;
        
        const loadedSettings = {
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          business_type: customerData?.business_type || 'farm',
          location: {
            address: customerData?.location?.address || '',
            city: customerData?.location?.city || '',
            country: customerData?.location?.country || 'Pakistan'
          },
          notifications: customerData?.notifications || {
            email_alerts: true,
            sms_alerts: false,
            push_notifications: true,
            weekly_reports: true,
            monthly_reports: true
          },
          system: customerData?.system || {
            auto_backup: true,
            data_retention_days: 365,
            session_timeout_minutes: 60,
            two_factor_auth: false
          },
          integrations: customerData?.integrations || {
            weather_api: true,
            market_prices: true,
            government_data: false
          }
        };
        
        setSettings(loadedSettings);
        // Set the initial 2FA state
        setInitialTwoFactorState(loadedSettings.system.two_factor_auth);
      } else {
        // Fallback to default settings if API fails
        const defaultSettings = {
          name: '',
          email: '',
          phone: '',
          business_type: 'farm',
          location: { address: '', city: '', country: 'Pakistan' },
          notifications: {
            email_alerts: true,
            sms_alerts: false,
            push_notifications: true,
            weekly_reports: true,
            monthly_reports: true
          },
          system: {
            auto_backup: true,
            data_retention_days: 365,
            session_timeout_minutes: 60,
            two_factor_auth: false
          },
          integrations: {
            weather_api: true,
            market_prices: true,
            government_data: false
          }
        };
        
        setSettings(defaultSettings);
        setInitialTwoFactorState(defaultSettings.system.two_factor_auth);
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Handle 2FA toggle separately if changed
      if (settings.system.two_factor_auth !== initialTwoFactorState) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || '/api'}/auth/toggle-2fa`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update 2FA settings');
        }
      }

      // Save user profile data (only name and phone are allowed on the profile endpoint)
      let profileRes;
      try {
        const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || '/api'}/auth/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            name: settings.name,
            phone: settings.phone
          })
        });
        
        profileRes = { 
          ok: profileResponse.ok, 
          data: profileResponse.ok ? await profileResponse.json() : null 
        };
      } catch (error) {
        console.error('Profile update failed:', error);
        profileRes = { ok: false, data: null };
      }

      // Save customer settings if available (excluding two_factor_auth since it's handled separately)
      const { two_factor_auth: _two_factor_auth, ...systemWithout2FA } = settings.system;
      await api.put('/api/customer/settings', {
        notifications: settings.notifications,
        system: systemWithout2FA,
        integrations: settings.integrations,
        location: settings.location
      }).catch(() => {
        // If customer settings endpoint doesn't exist, that's okay
        console.log('Customer settings endpoint not available')
      })

      // Check if profile update was successful
      if (profileRes && profileRes.ok) {
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        // If profile update failed, but 2FA was toggled successfully, we can still consider it a success
        // or at least show a partial success message
        if (settings.system.two_factor_auth !== initialTwoFactorState) {
          // 2FA was toggled, so it's a partial success
          setSaveStatus('success')
          setTimeout(() => setSaveStatus('idle'), 3000)
        } else {
          throw new Error('Failed to save profile settings')
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (section: keyof CustomerSettings, field: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, unknown>),
        [field]: value
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <AnimatedBackground className="min-h-screen">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your grain management system preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Saved successfully</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Save failed</span>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Clock className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>
                Basic information about your grain operation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => updateSettings('name', 'name', e.target.value)}
                    placeholder="Enter organization name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSettings('email', 'email', e.target.value)}
                    placeholder="Enter contact email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => updateSettings('phone', 'phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select value={settings.business_type} onValueChange={(value) => updateSettings('business_type', 'business_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farm">Farm</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="mill">Mill</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="cooperative">Cooperative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={settings.location.address}
                  onChange={(e) => updateSettings('location', 'address', e.target.value)}
                  placeholder="Enter your full address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={settings.location.city}
                    onChange={(e) => updateSettings('location', 'city', e.target.value)}
                    placeholder="Enter city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={settings.location.country}
                    onChange={(e) => updateSettings('location', 'country', e.target.value)}
                    placeholder="Enter country"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Bell className="h-6 w-6 text-emerald-600" />
                Notification Channels
              </CardTitle>
              <CardDescription>
                Configure the main channels through which you receive alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email & SMS */}
                <div className="space-y-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    Traditional Channels
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-semibold">Email Alerts</Label>
                      <p className="text-xs text-muted-foreground">Critical updates via email</p>
                    </div>
                    <Switch
                      checked={settings.notifications.email_alerts}
                      onCheckedChange={(checked) => updateSettings('notifications', 'email_alerts', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-semibold">SMS Alerts</Label>
                      <p className="text-xs text-muted-foreground">Urgent alerts via mobile</p>
                    </div>
                    <Switch
                      checked={settings.notifications.sms_alerts}
                      onCheckedChange={(checked) => updateSettings('notifications', 'sms_alerts', checked)}
                    />
                  </div>
                </div>

                {/* Reports */}
                <div className="space-y-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-400" />
                    Digest Reports
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-semibold">Weekly Summary</Label>
                      <p className="text-xs text-muted-foreground">Condensed weekly performance</p>
                    </div>
                    <Switch
                      checked={settings.notifications.weekly_reports}
                      onCheckedChange={(checked) => updateSettings('notifications', 'weekly_reports', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-semibold">Monthly Reports</Label>
                      <p className="text-xs text-muted-foreground">Detailed analytical reports</p>
                    </div>
                    <Switch
                      checked={settings.notifications.monthly_reports}
                      onCheckedChange={(checked) => updateSettings('notifications', 'monthly_reports', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Push Notifications Section */}
              <div className="mt-8 space-y-6">
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-lg font-bold text-slate-900 dark:text-white">Push Notifications</Label>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {hasPushSubscription ? 'System linked to this browser' : 'Link this browser to receive real-time alerts'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!hasPushSubscription ? (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={async () => {
                          const result = await getPushManager().subscribe();
                          if (result.success) {
                            toast.success("Successfully paired browser!");
                            setHasPushSubscription(true);
                            loadPushPreferences();
                          } else {
                            toast.error(result.message);
                          }
                        }}
                      >
                        Pair Browser
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={async () => {
                          setIsTestingPush(true);
                          const result = await getPushManager().sendTestNotification();
                          if (result.success) toast.success("Test notification sent!");
                          else toast.error(result.message);
                          setIsTestingPush(false);
                        }}
                        disabled={isTestingPush}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isTestingPush ? 'Sending...' : 'Test'}
                      </Button>
                    )}
                    <Switch
                      checked={pushPreferences?.push_enabled || false}
                      onCheckedChange={async (checked) => {
                        if (!pushPreferences) return;
                        const newPrefs = { ...pushPreferences, push_enabled: checked };
                        setPushPreferences(newPrefs);
                        const result = await getPushManager().updatePreferences(newPrefs);
                        if (!result.success) toast.error(result.message);
                      }}
                    />
                  </div>
                </div>

                {!hasPushSubscription && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">
                      <strong>Browser Pairing Required:</strong> Your current browser session is not receiving push notifications. Click &quot;Pair Browser&quot; above to start receiving real-time alerts.
                    </p>
                  </div>
                )}

                {pushPreferences && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Categories */}
                    <Card className="border-slate-100 bg-white/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Alert Categories</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3">
                        {['spoilage', 'dispatch', 'payment', 'insurance', 'invoice', 'batch', 'system'].map((cat) => {
                          const enabled = pushPreferences.categories[cat as keyof typeof pushPreferences.categories];
                          return (
                            <div key={cat} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                              <Label className="text-sm font-medium capitalize cursor-pointer" onClick={async () => {
                                const newPrefs = { ...pushPreferences, categories: { ...pushPreferences.categories, [cat]: !enabled } };
                                setPushPreferences(newPrefs);
                                await getPushManager().updatePreferences(newPrefs);
                              }}>
                                {cat === 'batch' ? 'Batch Updates' : cat}
                              </Label>
                              <Switch 
                                checked={enabled} 
                                onCheckedChange={async (val) => {
                                  const newPrefs = { ...pushPreferences, categories: { ...pushPreferences.categories, [cat]: val } };
                                  setPushPreferences(newPrefs);
                                  await getPushManager().updatePreferences(newPrefs);
                                }}
                              />
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    {/* Behavior & Schedule */}
                    <div className="space-y-6">
                      <Card className="border-slate-100 bg-white/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Behavior</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Volume2 className="w-4 h-4 text-slate-400" />
                              <Label className="font-semibold">Notification Sound</Label>
                            </div>
                            <Switch checked={pushPreferences.sound_enabled} onCheckedChange={async (v) => {
                              const n = { ...pushPreferences, sound_enabled: v };
                              setPushPreferences(n); await getPushManager().updatePreferences(n);
                            }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Vibrate className="w-4 h-4 text-slate-400" />
                              <Label className="font-semibold">Device Vibration</Label>
                            </div>
                            <Switch checked={pushPreferences.vibration_enabled} onCheckedChange={async (v) => {
                              const n = { ...pushPreferences, vibration_enabled: v };
                              setPushPreferences(n); await getPushManager().updatePreferences(n);
                            }} />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-100 bg-white/50">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Quiet Hours</CardTitle>
                          <Switch checked={pushPreferences.quiet_hours_enabled} onCheckedChange={async (v) => {
                            const n = { ...pushPreferences, quiet_hours_enabled: v };
                            setPushPreferences(n); await getPushManager().updatePreferences(n);
                          }} />
                        </CardHeader>
                        <CardContent className={cn("space-y-4 transition-opacity", !pushPreferences.quiet_hours_enabled && "opacity-40 pointer-events-none")}>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500">Start Time</Label>
                              <Input type="time" value={pushPreferences.quiet_hours_start} onChange={async (e) => {
                                const n = { ...pushPreferences, quiet_hours_start: e.target.value };
                                setPushPreferences(n);
                              }} onBlur={async () => await getPushManager().updatePreferences(pushPreferences)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500">End Time</Label>
                              <Input type="time" value={pushPreferences.quiet_hours_end} onChange={async (e) => {
                                const n = { ...pushPreferences, quiet_hours_end: e.target.value };
                                setPushPreferences(n);
                              }} onBlur={async () => await getPushManager().updatePreferences(pushPreferences)} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Configure system behavior and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Backup</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically backup data daily
                    </p>
                  </div>
                  <Switch
                    checked={settings.system.auto_backup}
                    onCheckedChange={(checked) => updateSettings('system', 'auto_backup', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all user logins
                    </p>
                  </div>
                  <Switch
                    checked={settings.system.two_factor_auth}
                    onCheckedChange={(checked) => updateSettings('system', 'two_factor_auth', checked)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retention">Data Retention (Days)</Label>
                    <Input
                      id="retention"
                      type="number"
                      value={settings.system.data_retention_days}
                      onChange={(e) => updateSettings('system', 'data_retention_days', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Session Timeout (Minutes)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={settings.system.session_timeout_minutes}
                      onChange={(e) => updateSettings('system', 'session_timeout_minutes', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                External Integrations
              </CardTitle>
              <CardDescription>
                Connect with external services for enhanced functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weather API</Label>
                    <p className="text-sm text-muted-foreground">
                      Get real-time weather data for risk assessment
                    </p>
                  </div>
                  <Switch
                    checked={settings.integrations.weather_api}
                    onCheckedChange={(checked) => updateSettings('integrations', 'weather_api', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Market Prices</Label>
                    <p className="text-sm text-muted-foreground">
                      Get current grain market prices
                    </p>
                  </div>
                  <Switch
                    checked={settings.integrations.market_prices}
                    onCheckedChange={(checked) => updateSettings('integrations', 'market_prices', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Government Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Access government agricultural data
                    </p>
                  </div>
                  <Switch
                    checked={settings.integrations.government_data}
                    onCheckedChange={(checked) => updateSettings('integrations', 'government_data', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </AnimatedBackground>
  )
}

// Wrapped component with Suspense for useSearchParams compatibility
export default function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    params.then(p => setLocale(p.locale));
  }, [params]);

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <SettingsPageContent _locale={locale} />
    </Suspense>
  )
}
